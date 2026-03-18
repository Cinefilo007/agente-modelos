import logging
import asyncio
import re
from telegram import Update, constants, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, MessageHandler, filters
from src.services.database import db
from src.services.ai_agent import ai_agent
from src.handlers.admin import ADMIN_ID

logger = logging.getLogger(__name__)

async def handle_business_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handler para mensajes recibidos vía Telegram Business.
    Esta función intercepta mensajes de clientes externos que escriben a la cuenta de la modelo.
    """
    business_msg = update.business_message
    if not business_msg:
        return

    client_tg = business_msg.from_user
    text = business_msg.text
    chat_id = business_msg.chat_id
    business_connection_id = business_msg.business_connection_id

    # 1. Identificar a la modelo dueña de la conexión
    # Nota: El objeto business_message no dice directamente quién es la modelo,
    # pero podemos inferirlo si guardamos la relación business_connection_id -> model_id en DB.
    # Por ahora, buscaremos si existe una modelo con este ID de chat (simplificación para dev).
    # En producción, Telegram envía el business_connection_id que debe estar linkeado en la tabla 'models'.
    
    # Buscamos la modelo por el chat_id donde llega el mensaje (asumiendo que es el chat de la modelo)
    # TODO: Implementar mapeo real de business_connection_id
    model = db.client.table("models").select("*").eq("status", "active").is_not("config_persona", "null").limit(1).execute()
    if not model.data:
        logger.warning(f"No se encontró modelo activa para manejar mensaje de negocio.")
        return
    
    model_data = model.data[0]
    model_uuid = model_data['id']
    model_tg_id = model_data['telegram_id']

    # 2. Verificar Créditos
    if model_data.get('credits_balance', 0) <= 0:
        logger.info(f"Modelo {model_tg_id} sin créditos. Bot Manager desactivado.")
        return

    # 3. Verificar Paciencia (Límite de mensajes por relación)
    # Buscamos o creamos la relación model-client
    client_data = db.get_client(client_tg.id)
    if not client_data:
        client_data = db.create_client_user(client_tg.id, client_tg.username or "Client")
    
    res_rel = db.client.table("model_client_relations").select("*").eq("model_id", model_uuid).eq("client_id", client_data['id']).maybe_single().execute()
    
    if not res_rel.data:
        # Nueva relación
        rel_data = db.client.table("model_client_relations").insert({
            "model_id": model_uuid,
            "client_id": client_data['id'],
            "status": "new"
        }).execute().data[0]
    else:
        rel_data = res_rel.data

    # Contar mensajes en esta relación
    msg_count_res = db.client.table("messages").select("id", count="exact").eq("relation_id", rel_data['id']).execute()
    msg_count = msg_count_res.count or 0
    patience_limit = model_data.get('config_patience', 10)

    if msg_count >= (patience_limit * 2): # *2 porque contamos ida y vuelta
        logger.info(f"Paciencia agotada para cliente {client_tg.id} con modelo {model_tg_id}.")
        return

    # 4. Preparar Contexto IA
    history = db.client.table("messages").select("sender_type, content, intent").eq("relation_id", rel_data['id']).order("created_at", desc=True).limit(6).execute().data
    history = history[::-1] if history else []
    
    hist_str = ""
    for m in history:
        role = "Cliente" if m['sender_type'] == "user" else "Modelo"
        hist_str += f"{role}: {m['content']}\n"

    # Cargar Contexto de Ventas y Variaciones
    try:
        with open("directives/sales_agent_system.md", "r", encoding="utf-8") as f:
            sop_context = f.read()
        with open("directives/customer_journey_analysis.md", "r", encoding="utf-8") as f:
            journey_context = f.read()
    except Exception as e:
        logger.error(f"Error cargando directivas: {e}")
        sop_context = "Actúa como una vendedora experta."
        journey_context = ""

    system_prompt = (
        f"ESTÁS ACTUANDO COMO: {model_data.get('config_persona', 'Una chica atractiva y simpática')}.\n"
        f"DATOS DE LA MODELO:\n"
        f"- Físico: {model_data.get('config_physique', 'No especificado')}\n"
        f"- Precios/Servicios: {model_data.get('config_prices', {}).get('raw_text', 'Consultar')}\n"
        f"- Pagos: {model_data.get('config_payments', {}).get('raw_text', 'Varios')}\n\n"
        f"SOP Y REGLAS:\n{sop_context}\n\n"
        f"ANÁLISIS DE VARIACIONES (CUSTOMER JOURNEY):\n{journey_context}\n\n"
        f"HISTORIAL RECIENTE:\n{hist_str}\n"
        "==============================================\n"
        "INSTRUCCIONES CLAVE:\n"
        "1. DETECCIÓN DE INTENCIÓN: Usa el Análisis de Variaciones arriba para clasificar al cliente.\n"
        "2. DETECCIÓN DE IDIOMA: Responde SIEMPRE en el mismo idioma que te hable el cliente.\n"
        "3. SI HAY INTERÉS REAL (Alta Intención / Interés Medio con avance): Termina con [INTENT: INTEREST].\n"
        "4. SI ES BAJA INTENCIÓN O TROLL: Termina con [INTENT: NO_INTEREST].\n"
        "5. PACIENCIA: Sé consciente de que cada charla gasta créditos. No alargues si no hay interés de pago.\n"
        "6. Responde de forma natural, estilo humano, sin sonar a bot."
    )

    # 5. Generar Respuesta
    db.log_message(model_uuid, "user", text, metadata={"relation_id": rel_data['id'], "chat_id": chat_id})
    
    ai_response = ai_agent.chat_completion("manager", system_prompt, text)
    
    # Procesar Intención
    intent = "chat"
    if "[INTENT: INTEREST]" in ai_response:
        intent = "interest"
    elif "[INTENT: NO_INTEREST]" in ai_response:
        intent = "no_interest"

    # 6. Enviar Notificación a la Modelo si hay Interés
    if intent == "interest":
        try:
            notif_text = (
                f"🔥 **¡CLIENTE INTERESADO!**\n\n"
                f"👤 **Cliente**: @{client_tg.username or 'Sin User'}\n"
                f"💬 **Último mensaje**: {text[:100]}...\n\n"
                f"¡Entra al chat para cerrar la venta!"
            )
            # Botón directo al chat (URL scheme de Telegram para chat específico si se tiene)
            # O simplemente avisar.
            await context.bot.send_message(chat_id=model_tg_id, text=notif_text, parse_mode="Markdown")
        except Exception as e:
            logger.error(f"Error notificando a modelo {model_tg_id}: {e}")

    # 7. Ejecutar Ghosting si no hay interés
    if intent == "no_interest":
        logger.info(f"Cliente {client_tg.id} marcado como 'no_interest'. Ghosting activado.")
        return

    # 8. Descontar Crédito (Solo si el bot responde)
    # TODO: Implementar lógica de descuento de créditos real
    # db.update_model(model_tg_id, {"credits_balance": model_data['credits_balance'] - 1})

    # 9. Enviar Respuesta en Burbujas
    bubbles = ai_agent.split_into_bubbles(ai_response)
    
    for bubble in bubbles:
        await context.bot.send_chat_action(chat_id=chat_id, action=constants.ChatAction.TYPING, business_connection_id=business_connection_id)
        await asyncio.sleep(len(bubble) * 0.04) # Simular escritura
        
        # Enviar vía Business
        await context.bot.send_message(
            chat_id=chat_id,
            text=bubble,
            business_connection_id=business_connection_id
        )
        db.log_message(model_uuid, "bot", bubble, intent=intent, metadata={"relation_id": rel_data['id']})

# Handler configurado específicamente para Telegram Business
business_handler = MessageHandler(
    filters.TEXT & ~filters.COMMAND, 
    handle_business_message,
    message_updates=False,          # NO capturar mensajes privados normales
    business_message_updates=True   # SÍ capturar mensajes de Telegram Business
)
