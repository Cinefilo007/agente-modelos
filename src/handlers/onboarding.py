import logging
import os
import asyncio
from telegram import Update, ReplyKeyboardRemove, constants
from telegram.error import BadRequest
from telegram.ext import ContextTypes, CommandHandler, MessageHandler, filters, ConversationHandler
from src.services.database import db
from src.services.ai_agent import ai_agent
from src.handlers.admin import get_admin_keyboard, ADMIN_ID

logger = logging.getLogger(__name__)

# States
SALES_CHAT = 0
SURVEY_NAME = 1
SURVEY_AGE = 2
SURVEY_COUNTRY = 3
SURVEY_SELFIE = 4
SURVEY_VIDEO = 5

# Config States (Existing)
CONFIG_PRECIOS = 6
CONFIG_PERSONALIDAD = 7
CONFIG_FISICO = 8
CONFIG_PAGOS = 9

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler del comando /start."""
    user = update.effective_user
    logger.info(f"User {user.id} ({user.username}) started bot")

    # 1. Check DB
    model = db.get_model(user.id)
    
    if not model:
        # Nuevo Prospecto -> SALES CHAT
        model_data = db.create_model(user.id, user.username or "Unknown", user.full_name)
        model_uuid = model_data['id'] if model_data else None
        
        # Log start
        if model_uuid:
            db.log_message(model_uuid, "user", "/start", intent="start_command")

        # Initial Greeting by AI
        system_prompt = (
            "Eres 'Nebula IA', Eres un Agente de Ventas de Software (B2B).\n"
            "ESTÁS HABLANDO CON: Una Creadora de Contenido (Modelo).\n"
            "TU OBJETIVO: Saludar amigablemente, presentarte brevemente y esperar su respuesta. NO vendas de inmediato.\n"
            "Ejemplo: 'Hola! Soy Nebula IA, tu asistente de ventas. ¿Cómo estás hoy?'\n"
            "Manténlo corto y casual (estilo WhatsApp)."
        )
        
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING)
        await asyncio.sleep(1.0)
        
        ai_response = ai_agent.chat_completion("hunter", system_prompt, "Hola") # Input dummy para iniciar
        
        if model_uuid:
            db.log_message(model_uuid, "bot", ai_response, intent="greeting")
            
        await update.message.reply_text(ai_response)
        return SALES_CHAT
    
    elif model['is_verified']:
        await update.message.reply_text("✅ Ya estás verificada. Escribe /setup si necesitas re-configurar tu perfil.")
        return ConversationHandler.END
    
    else:
        # Existe pero no verificado -> Retomar charla
        await update.message.reply_text("¡Hola de nuevo! ¿Seguimos conversando?")
        return SALES_CHAT

async def handle_sales_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Chat de ventas previo al registro."""
    user = update.effective_user
    user_text = update.message.text
    
    # Recuperar modelo
    model = db.get_model(user.id)
    if not model:
        # Fallback raro
        await update.message.reply_text("Error de sesión. Escribe /start.")
        return ConversationHandler.END

    # 0. Check Retry Status
    if model.get('status') == 'retry_needed':
        await update.message.reply_text("🔄 **Repetir Verificación**\n\nEl administrador ha solicitado que repitas el proceso (datos ilegibles o incompletos).\n\n1️⃣ Empecemos de nuevo: ¿Cuál es tu **Nombre y Apellido**?", parse_mode="Markdown")
        # Reset data logic could go here if needed, but overwriting is fine
        db.update_model(user.id, {"status": "verifying"}) # Set back to verifying
        return SURVEY_NAME

    # Log user message FIRST
    db.log_message(model['id'], "user", user_text, intent="user_reply")

    # 1. Recuperar Contexto
    history = db.get_chat_history(model['id'], limit=10)
    packages = db.get_active_credit_packages()
    
    pkg_text = "No disponibles por el momento."
    if packages:
        pkg_text = "\n".join([f"- {p['name']}: {p['credits']} créditos por ${p['price']}" for p in packages])

    # Formatear historial
    hist_str = ""
    for msg in history:
        role = "Modelo" if msg['sender_type'] == "user" else "Hunter"
        content = msg['content']
        import re
        clean_content = re.sub(r"\[INTENT:.*?\]", "", content).replace("(INTENT:", "").replace(")", "").strip()
        hist_str += f"{role}: {clean_content}\n"

    # Cargar directiva
    try:
        with open("directives/onboarding_flow.md", "r", encoding="utf-8") as f:
            flow_context = f.read()
    except Exception:
        flow_context = "No context available."

    # Prompt del Hunter REFINADO
    system_prompt = (
        "Eres 'Hunter', un Agente de Ventas y Reclutador de Modelos.\n"
        "ESTÁS CHATEANDO POR TELEGRAM CON UNA MODELO POTENCIAL.\n\n"
        "=== CONTEXTO ===\n"
        f"{flow_context}\n"
        "=== NUESTRO PRODUCTO ===\n"
        "Ofrecemos un SISTEMA AUTOMATIZADO DE RESPUESTA 24/7 para sus chats privados de Telegram.\n"
        "Esto funciona gracias a la característica 'Telegram Business' (Premium).\n"
        "TU PROMESA: Automatizar sus chats, filtrar curiosos y cerrar ventas 24/7.\n"
        "PROHIBIDO: NO damos 'visibilidad', NO traemos tráfico, NO somos agencia de marketing.\n\n"
        "=== PAQUETES DE CRÉDITOS ===\n"
        f"{pkg_text}\n"
        "=== HISTORIAL RECIENTE ===\n"
        f"{hist_str}\n"
        "==============================================\n\n"
        "INSTRUCCIONES CLAVE:\n"
        "1. **PROFESIONALIDAD**: Usa un tono profesional y directo. **MENOS EMOJIS** (Máximo 1 o 2 por mensaje, y solo si es necesario).\n"
        "2. **NO REPETIR**: Revisa el historial. Si ya saludaste, no saludes de nuevo. Si ya dijiste algo, no lo repitas.\n"
        "3. **VENTA**: Explica que conectas tu IA a su Telegram Business para responder clientes 24/7.\n"
        "4. **INTENCIÓN Y CONFIRMACIÓN**: \n"
        "   - Si la modelo dice 'quiero empezar', 'dale', 'ok', 'estoy lista' -> Tu respuesta debe terminar con: `[INTENT: CONFIRM_START]`.\n"
        "   - Si la modelo CONFIRMA explícitamente que quiere iniciar la VERIFICACIÓN (ej: responde 'Si' a tu pregunta de confirmación) -> `[INTENT: START_ONBOARDING]`.\n"
        "   - Resto -> `[INTENT: CHAT]`.\n"
        "5. **NOMBRE**: Si no tiene nombre en perfil, pregúntale casualmente.\n"
    )

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING)

    def clean_markdown(text):
        return text.replace("**", "*")

    try:
        # Generar respuesta
        full_response = ai_agent.chat_completion("hunter", system_prompt, user_text)
        
        # Procesar Intención
        intent = "chat"
        final_text = full_response
        
        import re
        match = re.search(r"\[INTENT:\s*([A-Z_]+)\]", full_response)
        if match:
            intent = match.group(1).lower()
            final_text = full_response.replace(match.group(0), "").strip()
        
        # Override logic for Confirmation
        # If user expresses intent to start, but hasn't explicitly confirmed "Verification", we ask first.
        # But wait, the prompt instruction handles the intent tag.
        # Logic: 
        # 1. intent == 'confirm_start' -> Bot says "Ready to verify?" -> User replies -> Next turn.
        # 2. intent == 'start_onboarding' -> User presumably replied "Yes" to verification -> We proceed.
        
        # Si el modelo predice START_ONBOARDING directamente sin haber preguntado confirmación antes, 
        # podríamos forzar la pregunta si no estamos seguros. Pero confiemos en el prompt por ahora o añadamos lógica de estado intermedio.
        
        # Dividir burbujas
        bubbles = ai_agent.split_into_bubbles(final_text)
        
        for bubble in bubbles:
            await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING)
            await asyncio.sleep(len(bubble) * 0.05) 
            
            clean_bubble = clean_markdown(bubble)
            db.log_message(model['id'], "bot", clean_bubble, intent=intent)
            
            try:
                await update.message.reply_text(clean_bubble, parse_mode="Markdown")
            except BadRequest:
                await update.message.reply_text(clean_bubble, parse_mode=None)
        
        # Acciones según intención
        if intent == "start_onboarding":
            # Direct Jump? Only if the text implies we are asking for name or starting.
            # But wait, if intent is start_onboarding, we usually want to transition.
            # User wants "Pregunte a ella si desea iniciar la encuesta".
            # So `confirm_start` -> Bot asks "Do you want to start verification?".
            # If user says "Yes", Model output should be `start_onboarding`.
            
            await asyncio.sleep(1)
            await update.message.reply_text("🚀 **Excelente.**\n\n1️⃣ Empecemos: ¿Cuál es tu **Nombre y Apellido** real?", parse_mode="Markdown")
            return SURVEY_NAME
            
        elif intent == "confirm_start":
             # The bot reply (generated by AI) should have asked "Do you want to start verification?"
             pass

    except Exception as e:
        logger.error(f"Error en Sales Chat: {e}")
        await update.message.reply_text("Ups, se me cortó la señal. ¿Me decías?")

    return SALES_CHAT

async def survey_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.message.text
    if name.lower() in ['/cancel', 'cancelar']: return await cancel(update, context)
    
    user = update.effective_user
    db.update_model(user.id, {"full_name": name})
    
    await update.message.reply_text(f"Un gusto, {name}.\n\n2️⃣ ¿Qué **edad** tienes? (Debes ser mayor de edad).", parse_mode="Markdown")
    return SURVEY_AGE

async def survey_age(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text.lower() in ['/cancel', 'cancelar']: return await cancel(update, context)
    
    user = update.effective_user
    if not text.isdigit():
        await update.message.reply_text("⚠️ Por favor ingresa solo el número (Ej: 22).")
        return SURVEY_AGE
    
    age = int(text)
    if age < 18:
        await update.message.reply_text("⛔ Lo sentimos, no trabajamos con menores de edad.")
        db.update_model(user.id, {"status": "rejected", "age": age})
        return ConversationHandler.END
    
    db.update_model(user.id, {"age": age})
    await update.message.reply_text("Perfecto.\n\n3️⃣ ¿De qué **país** eres?", parse_mode="Markdown")
    return SURVEY_COUNTRY

async def survey_country(update: Update, context: ContextTypes.DEFAULT_TYPE):
    country = update.message.text
    if country.lower() in ['/cancel', 'cancelar']: return await cancel(update, context)
    
    user = update.effective_user
    db.update_model(user.id, {"country": country})
    
    await update.message.reply_text(
        "📝 Anotado.\n\n4️⃣ **Verificación de Identidad**\n"
        "Por favor envía una **SELFIE** (foto) sosteniendo tu **Cédula/DNI/Pasaporte** cerca de tu rostro.\n"
        "✅ Deben verse claros tus datos y tu cara.\n"
        "� No envíes texto, solo la foto.\n\n"
        "Escribe /cancel para salir.",
        parse_mode="Markdown"
    )
    return SURVEY_SELFIE

async def survey_selfie(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    # Check Cancel
    if update.message.text and update.message.text.lower() in ['/cancel', 'cancelar']:
        return await cancel(update, context)

    photo = update.message.photo
    if not photo:
        await update.message.reply_text("⚠️ **Error**: Esperaba una FOTO (Selfie). Por favor inténtalo de nuevo.", parse_mode="Markdown")
        return SURVEY_SELFIE
        
    photo_id = photo[-1].file_id
    db.update_model(user.id, {"id_photo_id": photo_id})
    
    await update.message.reply_text(
        "📸 Foto recibida.\n\n5️⃣ **Último paso: Video Mensaje**\n"
        "Envía un **Video Mensaje** (la burbuja redonda) diciendo:\n"
        "🗣️ _\"Yo, [Tu Nombre], acepto los términos y condiciones, y me uno a esta agencia bajo mi propia voluntad.\"_\n\n"
        "¡Haz click en el micrófono para cambiar a cámara y mantén presionado para grabar!",
        parse_mode="Markdown"
    )
    return SURVEY_VIDEO

async def survey_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    if update.message.text and update.message.text.lower() in ['/cancel', 'cancelar']:
        return await cancel(update, context)

    video_note = update.message.video_note
    if not video_note:
        await update.message.reply_text("⚠️ **Error**: Debes enviar un VIDEO MENSAJE (Burbuja). No un video de galería ni texto.", parse_mode="Markdown")
        return SURVEY_VIDEO

    # Guardar video ID
    db.update_model(user.id, {"verification_video_id": video_note.file_id, "status": "verifying"})
    
    await update.message.reply_text("✅ **¡Encuesta Completada!**\n\nHe enviado todo al administrador. Espera mi aviso.", parse_mode="Markdown")
    
    # --- ENVIAR AL ADMIN ---
    # --- ENVIAR AL ADMIN ---
    try:
        model = db.get_model(user.id)
        
        # Helper para escapar HTML
        from html import escape
        safe_name = escape(model.get('full_name', 'N/A'))
        safe_country = escape(model.get('country', 'N/A'))
        safe_user = escape(model.get('username', 'SinUser'))
        
        caption = (
            f"🕵️ <b>SOLICITUD DE VERIFICACIÓN</b>\n\n"
            f"👤 <b>Nombre</b>: <a href='tg://user?id={user.id}'>{safe_name}</a>\n"
            f"🔢 <b>Edad</b>: {model.get('age', 'N/A')}\n"
            f"🌍 <b>País</b>: {safe_country}\n"
            f"🔗 <b>User</b>: @{safe_user}\n"
            f"🆔 <code>{user.id}</code>"
        )
        
        # Intentar enviar Selfie con Caption
        sent_header = False
        if model.get('id_photo_id'):
            try:
                await context.bot.send_photo(
                    chat_id=ADMIN_ID,
                    photo=model.get('id_photo_id'),
                    caption=caption,
                    parse_mode=constants.ParseMode.HTML,
                    reply_markup=get_admin_keyboard(user.id)
                )
                sent_header = True
            except Exception as e:
                logger.error(f"Error enviando foto admin: {e}")
        
        if not sent_header:
            await context.bot.send_message(
                chat_id=ADMIN_ID,
                text=caption,
                parse_mode=constants.ParseMode.HTML,
                reply_markup=get_admin_keyboard(user.id)
            )

        # Video Note siempre aparte
        if model.get('verification_video_id'):
            await context.bot.send_message(chat_id=ADMIN_ID, text="📹 <b>Video de Aceptación:</b>", parse_mode=constants.ParseMode.HTML)
            await context.bot.send_video_note(chat_id=ADMIN_ID, video_note=model.get('verification_video_id'))

    except Exception as e:
        logger.error(f"Error CRÍTICO enviando reporte admin: {e}")
    
    return ConversationHandler.END

# --- SETUP CONFIG (Post-Aprobación) ---
async def setup_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia la configuración (solo si está verificado)."""
    user = update.effective_user
    model = db.get_model(user.id)
    
    if not model or not model.get('is_verified'):
        await update.message.reply_text("⛔ Debes estar verificada para configurar el bot.")
        return ConversationHandler.END

    await update.message.reply_text(
        "⚙️ **Configuración del Asistente**\n\n"
        "1️⃣ **PRECIOS Y SERVICIOS**\n"
        "Lista tus servicios y precios (Ej: 'Pack 5 fotos $10, Video $20')."
    )
    return CONFIG_PRECIOS

async def save_precios(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    db.update_model(user.id, {"config_prices": {"raw_text": update.message.text}})
    await update.message.reply_text("2️⃣ **PERSONALIDAD**\n¿Cómo quieres que trate a tus fans? (Ej: 'Cariñosa', 'Dominante').")
    return CONFIG_PERSONALIDAD

async def save_personalidad(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    db.update_model(user.id, {"config_persona": update.message.text})
    await update.message.reply_text("3️⃣ **FÍSICO**\nDescribe tu físico (Ej: 'Rubia, ojos verdes').")
    return CONFIG_FISICO

async def save_fisico(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    db.update_model(user.id, {"config_physique": update.message.text})
    await update.message.reply_text("4️⃣ **PAGOS**\n¿Qué medios aceptas? (Ej: 'Binance, PayPal').")
    return CONFIG_PAGOS

async def save_pagos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    db.update_model(user.id, {"config_payments": {"raw_text": update.message.text}, "status": "active"})
    await update.message.reply_text("✅ **¡Listo!** Tu bot está configurado y activo.")
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Operación cancelada.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END

async def warning_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja cuando el usuario envía algo que no es un Video Note."""
    await update.message.reply_text("⚠️ **Atención**: Necesito un **Video Mensaje** (la burbuja redonda).\n\nEn Telegram, toca (o mantén) el icono de micrófono para cambiar a cámara, y luego graba.", parse_mode="Markdown")
    return SURVEY_VIDEO

onboarding_handler = ConversationHandler(
    entry_points=[
        CommandHandler("start", start),
        CommandHandler("setup", setup_command)
    ],
    states={
        SALES_CHAT: [MessageHandler(filters.TEXT & ~filters.COMMAND, handle_sales_chat)],
        SURVEY_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, survey_name)],
        SURVEY_AGE: [MessageHandler(filters.TEXT & ~filters.COMMAND, survey_age)],
        SURVEY_COUNTRY: [MessageHandler(filters.TEXT & ~filters.COMMAND, survey_country)],
        SURVEY_SELFIE: [MessageHandler(filters.PHOTO, survey_selfie)],
        SURVEY_VIDEO: [
            MessageHandler(filters.VIDEO_NOTE, survey_video),
            MessageHandler(filters.ALL & ~filters.COMMAND, warning_video)
        ],
        # Config
        CONFIG_PRECIOS: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_precios)],
        CONFIG_PERSONALIDAD: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_personalidad)],
        CONFIG_FISICO: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_fisico)],
        CONFIG_PAGOS: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_pagos)],
    },
    fallbacks=[CommandHandler("cancel", cancel)]
)
