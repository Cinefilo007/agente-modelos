import logging
import asyncio
import re
from telegram import Update, constants, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, MessageHandler, filters, BusinessConnectionHandler
from src.services.database import db
from src.services.ai_agent import ai_agent
from src.handlers.admin import ADMIN_ID

logger = logging.getLogger(__name__)

async def handle_business_connection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handler para capturar cuando una modelo conecta/desconecta el bot a su cuenta Business.
    """
    conn = update.business_connection
    if not conn:
        return
    
    model_tg_id = conn.user.id
    is_enabled = conn.is_enabled
    connection_id = conn.id
    
    logger.info(f"Business connection update for {model_tg_id}: enabled={is_enabled}, id={connection_id}")
    
    if is_enabled:
        # Guardar el connection_id en la base de datos para esta modelo
        db.client.table("models").update({"business_connection_id": connection_id}).eq("telegram_id", model_tg_id).execute()
    else:
        # Limpiar si se desconecta
        db.client.table("models").update({"business_connection_id": None}).eq("telegram_id", model_tg_id).execute()

async def check_stories_permissions(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando para que la modelo verifique si el bot tiene permisos de historias.
    """
    user_tg_id = update.effective_user.id
    
    model = db.get_model(user_tg_id)
    if not model:
        await update.message.reply_text("❌ No estás registrada como modelo.")
        return
    
    conn_id = model.get('business_connection_id')
    if not conn_id:
        await update.message.reply_text(
            "❌ **Telegram Business no sincronizado**\n\n"
            "Si ya activaste el bot en 'Ajustes > Telegram Business > Chatbot' y sigues viendo este mensaje, haz lo siguiente:\n\n"
            "1️⃣ Ve a tus ajustes de **Telegram Business**.\n"
            "2️⃣ Entra en **Chatbot**.\n"
            "3️⃣ **Desactiva** este bot y vuelve a **activarlo** inmediatamente.\n"
            "4️⃣ Regresa aquí y usa `/check_stories` de nuevo.\n\n"
            "Esto forzará a Telegram a enviarme tus credenciales de negocio. 🚀"
        )
        return

    await update.message.reply_text(
        f"✅ **¡Todo listo!**\n"
        f"Conexión Business: `{conn_id}`\n\n"
        f"Ya puedes publicar historias automáticas desde tu panel web. "
        f"Asegúrate de tener **Telegram Premium** activo en esta cuenta."
    )

async def handle_business_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handler para mensajes recibidos vía Telegram Business.
    Esta función intercepta mensajes de clientes externos que escriben a la cuenta de la modelo.
    """
    # === AJUSTE DE IA ===
    # Modifica este valor para hacer al bot más creativo o más literal.
    # 0.2: Muy literal, robótico, estricto con el prompt.
    # 0.7: Hablador, humano, creativo (Recomendado para OnlyFans/Scorts).
    # 0.9: Extremadamente asertivo y errático.
    BOT_TEMPERATURE = 0.5
    # ====================

    business_msg = update.business_message
    if not business_msg:
        return

    client_tg = business_msg.from_user
    text = business_msg.text
    chat_id = business_msg.chat_id
    business_connection_id = business_msg.business_connection_id

    # 1. Identificar a la modelo dueña de la conexión
    # Buscamos la modelo por su business_connection_id
    try:
        if not business_connection_id:
            logger.error("Mensaje de negocio recibido sin business_connection_id.")
            return

        model = db.client.table("models").select("*").eq("business_connection_id", business_connection_id).eq("status", "active").not_.is_("config_persona", "null").limit(1).execute()
        
        if not model or not model.data:
            logger.warning(f"No se encontró modelo activa con business_connection_id {business_connection_id}. La modelo debe vincular el bot o configurar su personalidad.")
            return
        
        model_data = model.data[0]
        model_uuid = model_data['id']
        model_tg_id = model_data['telegram_id']

    except Exception as e:
        logger.error(f"Error consultando modelo en DB: {e}")
        return

    # 1.5. Filtrar mensajes de la propia modelo (Outgoing)
    # Si la modelo escribe manualmente, el bot no debe responderle a ella misma
    if client_tg.id == model_tg_id:
        # Aquí opcionalmente podríamos guardar el mensaje manual en la BD como 'assistant' para dar más contexto a la IA
        # Pero por ahora solo lo ignoramos para evitar auto-respuestas.
        return

    # 2. Verificar Créditos
    if model_data.get('credits_balance', 0) <= 0:
        logger.info(f"Modelo {model_tg_id} sin créditos. Bot Manager desactivado.")
        return

    # 3. Verificar Paciencia (Límite de mensajes por relación)
    # Buscamos o creamos la relación model-client
    client_data = db.get_client(client_tg.id)
    if not client_data:
        client_data = db.create_client_user(client_tg.id, client_tg.username or "Client")
    
    res_rel = db.client.table("model_client_relations").select("*").eq("model_id", model_uuid).eq("client_id", client_data['id']).execute()
    
    if not res_rel or not res_rel.data:
        try:
            # Nueva relación
            res_insert = db.client.table("model_client_relations").insert({
                "model_id": model_uuid,
                "client_id": client_data['id'],
                "status": "new"
            }).execute()
            if not res_insert or not res_insert.data:
                logger.error("Error creando relación model-client")
                return
            rel_data = res_insert.data[0]
        except Exception as e:
            logger.error(f"Excepción insertando relación: {e}")
            return
    else:
        rel_data = res_rel.data[0]

    # Contar mensajes en esta relación
    msg_count_res = db.client.table("messages").select("id", count="exact").eq("relation_id", rel_data['id']).execute()
    msg_count = 0
    if msg_count_res and hasattr(msg_count_res, 'count'):
        msg_count = msg_count_res.count or 0
    patience_limit = model_data.get('config_patience', 10)

    if msg_count >= (patience_limit * 2): # *2 porque contamos ida y vuelta
        logger.info(f"Paciencia agotada para cliente {client_tg.id} con modelo {model_tg_id}.")
        return

    # 4. Preparar Contexto IA (Aumentado a 12 para mejor entendimiento)
    history_rows = db.client.table("messages").select("sender_type, content").eq("relation_id", rel_data['id']).order("created_at", desc=True).limit(12).execute().data
    history_rows = history_rows[::-1] if history_rows else []
    
    ai_history = []
    for m in history_rows:
        role = "user" if m['sender_type'] == "user" else "assistant"
        ai_history.append({"role": role, "content": m['content']})

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

    prices_config = model_data.get('config_prices') or {}
    payments_config = model_data.get('config_payments') or {}
    
    prices_text = prices_config.get('text', prices_config.get('raw_text', 'No especificado. Pregúntale qué busca'))
    payments_text = payments_config.get('text', payments_config.get('raw_text', 'Consultar'))

    system_prompt = (
        f"ERES: {model_data.get('config_persona', 'Una chica atractiva y coqueta, hablando por chat privado.')}\n"
        f"TU FÍSICO: {model_data.get('config_physique', 'No especificado explícitamente')}\n"
        f"TUS SERVICIOS Y PRECIOS REALES: {prices_text}\n"
        f"MÉTODOS DE PAGO: {payments_text}\n\n"
        "==============================================\n"
        "DIRECTIVA SUPREMA DE COMPORTAMIENTO (LENGUAJE NATURAL):\n"
        "Eres una persona real escribiendo desde tu teléfono. Tu objetivo principal es seducir al cliente, vender tus servicios de contenido explícito, y conseguir que pague.\n"
        "1. PROHIBICIÓN ABSOLUTA DE FORMATO: NUNCA, BAJO NINGUNA CIRCUNSTANCIA uses asteriscos (*), negritas, cursivas, corchetes o acciones de rol como [WINK], *sonríe* o *te guiña un ojo*. ESCRIBE SOLO TEXTO PLANO COMO EN WHATSAPP.\n"
        "2. NUNCA INVENTES PRECIOS: Cíñete ESTRICTAMENTE a 'TUS SERVICIOS Y PRECIOS REALES'. Si algo no está ahí, no lo ofrezcas ni inventes cifras al azar.\n"
        "3. Tono conversacional: Usa mensajes cortos. Puedes usar emojis de forma natural (😘, 🔥, 😈), pero no exageres. Haz preguntas sutiles para mantenerlo enganchado.\n"
        "4. Seducción y Ventas (El Embudo):\n"
        "   - Fase 1 (Crear deseo): Si saluda, saluda de vuelta con coqueteo sutil. No vomites todos tus precios de golpe. Pregúntale qué le gusta o qué busca hoy.\n"
        "   - Fase 2 (Presentar oferta): Si pregunta por servicios o precios, dile lo que ofreces de tu lista con un tono sexy, pero directo al grano.\n"
        "   - Fase 3 (Cierre - AQUÍ USAS [NOTIFY]): El bot SOLO debe emitir el comando [NOTIFY] si y solo si el cliente CONFIRMA EXPLÍCITAMENTE que quiere comprar, pagar o suscribirse AHORA MISMO (ej: 'Sí, lo quiero', 'Pásame tu zelle', 'A dónde deposito'). NO USES [NOTIFY] solo porque preguntó precios.\n"
        "5. Trolls y Cero Interés: Si la persona insulta, pide cosas gratis reiteradamente, o no tiene sentido lógico, usa la palabra [GHOST] al final de tu mensaje.\n"
        "6. PACIENCIA: No seas desesperada por vender. Sé una diosa inalcanzable pero accesible previo pago. Si el cliente duda, dáselo a desear, y si no avanza, despídete sutilmente.\n"
        "7. NOMBRES: NUNCA digas cosas como '[Tu nombre]' o '[Inserta tu nombre]'. Si no sabes tu nombre, simplemente usa apodos cariñosos (amor, bebé, cielo).\n"
    )

    # 5. Generar Respuesta
    db.log_message(model_uuid, "user", text, metadata={"relation_id": rel_data['id'], "chat_id": chat_id})
    
    ai_response = ai_agent.chat_completion("manager", system_prompt, text, history=ai_history, temperature=BOT_TEMPERATURE)
    
    # === PURA FUERZA: Eliminar cualquier texto entre asteriscos (acciones de rol) ===
    # El LLM a veces ignora la orden de no usar asteriscos, así que los borramos por código.
    ai_response = re.sub(r'\*[^*]+\*', '', ai_response).strip()
    # Limpiamos también si usa paréntesis para rol "(sonríe)" si es toda la frase, aunque el regex de asteriscos es el principal
    
    # Procesar Intención
    intent = "chat"
    if "[NOTIFY]" in ai_response:
        intent = "notify"
    elif "[GHOST]" in ai_response:
        intent = "ghost"

    # 6. Enviar Notificación a la Modelo si hay Interés Real
    if intent == "notify":
        try:
            # Escapar caracteres para MarkdownV2 (PTB recomienda escapar casi todo)
            def escape_md(t):
                return re.sub(r'([_*\[\]()~`>#+\-=|{}.!])', r'\\\1', str(t))

            clean_text = escape_md(text[:100])
            
            # Template limpio y debidamente escapado
            notif_text = (
                f"🔥 *CLIENTE INTERESADO*\n\n"
                f" *Mensaje*: {clean_text}\n\n"
                f"Entra al chat para cerrar la venta"
            )
            # Quitamos los signos de exclamación del template fijo o los escapamos
            notif_text = notif_text.replace("!", "\\!")
            
            # Crear botón para ir al perfil del cliente (funciona sin username)
            keyboard = [[InlineKeyboardButton("Ver Perfil", url=f"tg://user?id={client_tg.id}")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=model_tg_id, 
                text=notif_text, 
                parse_mode="MarkdownV2",
                reply_markup=reply_markup
            )
        except Exception as e:
            logger.error(f"Error notificando a modelo {model_tg_id}: {e}")

    # 7. Ejecutar Ghosting si no hay interés
    if intent == "ghost":
        logger.info(f"Cliente {client_tg.id} marcado como 'ghost'. Ghosting activado.")
        return

    # 8. Descontar Crédito (Solo si el bot responde)
    # TODO: Implementar lógica de descuento de créditos real
    # db.update_model(model_tg_id, {"credits_balance": model_data['credits_balance'] - 1})

    # 9. Enviar Respuesta en Burbujas
    bubbles = ai_agent.split_into_bubbles(ai_response)
    
    for bubble in bubbles:
        try:
            await context.bot.send_chat_action(chat_id=chat_id, action=constants.ChatAction.TYPING, business_connection_id=business_connection_id)
        except Exception:
            pass # Ignorar si falla la acción de escritura (no es vital)
            
        await asyncio.sleep(len(bubble) * 0.04) # Simular escritura
        
        # Enviar vía Business
        try:
            await context.bot.send_message(
                chat_id=chat_id,
                text=bubble,
                business_connection_id=business_connection_id
            )
            db.log_message(model_uuid, "bot", bubble, intent=intent, metadata={"relation_id": rel_data['id']})
        except Exception as e:
            logger.error(f"Error enviando mensaje Business a {chat_id}: {e}")
            # Si falla el canal de negocio, el cliente no verá la respuesta.

async def reset_chat_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Limpia el historial de chats y relaciones de la modelo (Solo para pruebas)."""
    user_tg_id = update.effective_user.id
    
    # 1. Verificar si es una modelo
    model_res = db.client.table("models").select("id").eq("telegram_id", user_tg_id).execute()
    if not model_res or not model_res.data:
        await update.message.reply_text("❌ Solo las modelos registradas pueden usar este comando.")
        return

    model_uuid = model_res.data[0]['id']
    
    try:
        # 2. Borrar mensajes
        db.client.table("messages").delete().eq("model_id", model_uuid).execute()
        
        # 3. Borrar relaciones
        db.client.table("model_client_relations").delete().eq("model_id", model_uuid).execute()
        
        logger.info(f"Modelo {user_tg_id} reseteó su historial.")
        await update.message.reply_text("✨ **Historial Limpiado**\nTodos tus chats y límites de paciencia han sido reseteados para nuevas pruebas.")
    except Exception as e:
        logger.error(f"Error en comando reset: {e}")
        await update.message.reply_text("❌ Hubo un error al limpiar tu historial.")

# Filtro para detectar EXCLUSIVAMENTE mensajes de Telegram Business
class BusinessMessageFilter(filters.BaseFilter):
    def filter(self, update: Update):
        # Un mensaje de negocio tiene el atributo business_message poblado
        return bool(getattr(update, 'business_message', None))

# Handler configurado para negocio sin argumentos que causen crash en versiones antiguas
business_handler = MessageHandler(
    BusinessMessageFilter() & filters.TEXT & ~filters.COMMAND, 
    handle_business_message
)

# Nuevo handler para conexiones business
business_connection_handler = BusinessConnectionHandler(handle_business_connection)
