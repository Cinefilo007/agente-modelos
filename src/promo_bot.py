import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram import Update
from telegram.ext import (
    ApplicationBuilder, 
    Application, 
    CommandHandler, 
    MessageHandler, 
    filters, 
    ContextTypes,
    ChatMemberHandler
)

from src.services.database import SupabaseClient
from src.services.promo_jobs import init_scheduler

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

db = SupabaseClient()

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /start. Si es en un chat privado, da la bienvenida e instrucciones.
    """
    chat_type = update.effective_chat.type
    
    if chat_type == 'private':
        user_id = update.effective_user.id
        await update.message.reply_text(
            "🚀 Bienvenido al **Promo Bot SFS**.\n\n"
            "Soy el encargado de gestionar tus acuerdos de visualizaciones y protegerte contra fraudes.\n\n"
            "**Instrucciones:**\n"
            "1. Añádeme como Administrador a los canales que desees registrar.\n"
            "2. Envíame o reenvíame aquí mismo el post que deseas usar para tus campañas SFS (puedes incluir imágenes y emojis premium).\n"
            "3. Ve a tu panel en la Mini App para crear propuestas.",
            parse_mode='Markdown'
        )

async def handle_forwarded_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Captura los mensajes reenviados (o enviados) en el chat privado para guardarlos como Templates.
    """
    if update.effective_chat.type != 'private':
        return

    message = update.message
    telegram_id = update.effective_user.id

    try:
        # Buscar la modelo en la BD
        model_data = db.client.table('models').select('id, username').eq('telegram_id', telegram_id).execute()
        if not model_data.data:
            await update.message.reply_text("❌ No estás registrada como modelo en nuestro sistema. Por favor, regístrate a través de nuestro bot principal primero.")
            return
            
        model_id = model_data.data[0]['id']
        username = model_data.data[0]['username']

        # Extraer data completa del mensaje (text, caption, entities, media_group_id...)
        content_data = message.to_dict()
        
        # Eliminar info sensible o innecesaria antes de guardar
        if 'from' in content_data: del content_data['from']
        if 'chat' in content_data: del content_data['chat']
        if 'date' in content_data: del content_data['date']

        # Guardar en base de datos
        db.client.table('promo_templates').insert({
            'model_id': model_id,
            'telegram_message_id_origin': message.message_id,
            'content_data': content_data
        }).execute()

        link_portal = f"https://tuportal.com/{username}" if username else "https://tuportal.com"

        await update.message.reply_text(
            "✅ **¡Post guardado exitosamente!**\n\n"
            "Este diseño ha sido guardado en tus Plantillas. Cuando aceptes o propongas un SFS desde la Mini App, este post se publicará exactamente así, incluyendo tus emojis premium.\n\n"
            f"ℹ️ *Nota:* Al momento de publicarse, automáticamente añadiremos al final un enlace hacia tu perfil en la agencia ({link_portal}) para ayudarte a conseguir más clientes cautivos.",
            parse_mode='Markdown'
        )
    except Exception as e:
        logger.error(f"Error guardando template: {e}")
        await update.message.reply_text("❌ Hubo un error al guardar tu post. Inténtalo de nuevo más tarde.")

async def handle_my_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detecta cuando el bot es añadido o removido como administrador de un canal o grupo.
    """
    result = update.my_chat_member
    chat = result.chat
    new_status = result.new_chat_member.status
    
    # Solo nos interesan los canales
    if chat.type != 'channel':
        return

    try:
        if new_status in ['administrator', 'creator']:
            # El bot fue añadido como admin o es el creador
            user_id = result.from_user.id
            
            # Buscar la modelo
            model_data = db.client.table('models').select('id').eq('telegram_id', user_id).execute()
            if not model_data.data:
                logger.warning(f"Usuario {user_id} intentó agregar el bot al canal {chat.id} pero no es modelo.")
                return
                
            model_id = model_data.data[0]['id']
            
            # Upsert del canal en la base de datos
            db.client.table('channels').upsert({
                'model_id': model_id,
                'telegram_chat_id': chat.id,
                'name': chat.title,
                'status': 'verifying'
            }, on_conflict='model_id, telegram_chat_id').execute()
            
            # Enviar mensaje al usuario confirmando
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📡 **Canal vinculado:** '{chat.title}'\n\nHe empezado a monitorear este canal. En 24 horas recolectaré las métricas de vistas (Engagement Rate) para asignarle una calificación de calidad e incluirlo en el catálogo.",
                parse_mode='Markdown'
            )
            logger.info(f"Nuevo canal registrado: {chat.title} ({chat.id}) por la modelo {model_id}")
            
        elif new_status in ['kicked', 'left']:
            # El bot fue eliminado del canal
            # Marcar el canal como inactivo
            db.client.table('channels').update({'status': 'inactive'}).eq('telegram_chat_id', chat.id).execute()
            logger.info(f"Bot removido del canal {chat.id}")
            
    except Exception as e:
        logger.error(f"Error procesando my_chat_member: {e}")

def main():
    token = os.getenv("PROMO_TELEGRAM_TOKEN")
    if not token:
        logger.error("PROMO_TELEGRAM_TOKEN not found in .env")
        return

    logger.info("Iniciando Promo Bot...")
    
    app = ApplicationBuilder().token(token).build()

    # Handlers
    app.add_handler(CommandHandler("start", start_handler))
    
    # Listener de administración (detectar cuando lo añaden a un canal)
    app.add_handler(ChatMemberHandler(handle_my_chat_member, ChatMemberHandler.MY_CHAT_MEMBER))
    
    # Listener de mensajes reenviados/enviados (creación de templates)
    # Filtro: cualquier texto o media, que esté en chat privado, que no sea comando
    app.add_handler(MessageHandler(
        filters.ChatType.PRIVATE & ~filters.COMMAND, 
        handle_forwarded_post
    ))

    # Iniciar Cron Jobs de Promociones (SFS, Métricas)
    init_scheduler(app.bot)

    logger.info("Promo Bot Iniciado. Escuchando...")
    app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
