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

from src.services.database import db
from src.services.promo_jobs import init_scheduler

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /start. Si es en un chat privado, da la bienvenida e instrucciones.
    """
    chat_type = update.effective_chat.type
    
    if chat_type == 'private':
        await update.message.reply_text(
            "✅ **Conexión Exitosa con el SFS Bot.**\n\n"
            "🚀 Bienvenida a **@Nebula\_sfs\_bot**.\n\n"
            "Soy el gestor oficial de acuerdos SFS de la agencia. Protejo tus acuerdos y automatizo la publicación.\n\n"
            "**Instrucciones:**\n"
            "1. Añádeme como Administrador a los canales que desees registrar.\n"
            "2. Envíame o reenvíame aquí mismo el post que quieres usar para tus campañas SFS.\n"
            "3. Ve a tu panel en el portal para crear propuestas.",
            parse_mode='Markdown'
        )



async def handle_forwarded_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Captura los mensajes reenviados (o enviados) en el chat privado.
    1. Si es reenviado desde un canal, intenta registrar ese canal.
    2. Si no es un canal, o si ya se registró, lo guarda como Template SFS.
    """
    if update.effective_chat.type != 'private':
        return

    message = update.message
    telegram_id = update.effective_user.id
    LANDING_URL = os.getenv("LANDING_URL", "https://agente-modelos-production.up.railway.app/landing")

    try:
        # Verificar modelo activa
        model_data = db.client.table('models').select('id, username, status').eq('telegram_id', telegram_id).execute()
        if not model_data.data:
            await update.message.reply_text(f"❌ No estás registrada.\nRegístrate: {LANDING_URL}")
            return
        
        model = model_data.data[0]
        if model['status'] != 'active':
            await update.message.reply_text("⏳ Tu cuenta aun no ha sido aprobada.")
            return

        model_id = model['id']
        username = model['username']

        # CASO 1: VERIFICAR SI VIENE DE UN CANAL Y EL BOTO ESTA DE ADMIN (Deprecado a favor de código)
        # Ahora usamos el manejador de posts en el canal directamente.
        
        # CASO 2: GUARDAR TEMPLATE PROMOCIONAL
        content_data = message.to_dict()
        if 'from' in content_data: del content_data['from']
        if 'chat' in content_data: del content_data['chat']
        if 'date' in content_data: del content_data['date']

        db.client.table('promo_templates').insert({
            'model_id': model_id,
            'telegram_message_id_origin': message.message_id,
            'content_data': content_data
        }).execute()

        link_portal = f"https://tuportal.com/{username}" if username else "https://tuportal.com"

        await update.message.reply_text(
            "✅ **¡Post guardado exitosamente!**\n\n"
            "Este diseño ha sido guardado en tus Plantillas. Cuando aceptes o propongas un SFS desde la Mini App, este post se publicará exactamente así.\n\n"
            f"ℹ️ *Nota:* Añadiremos al final un enlace hacia tu perfil ({link_portal}).",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"Error general en handler: {e}")
        await update.message.reply_text("❌ Hubo un error al procesar tu solicitud.")

async def handle_channel_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Escucha todos los posts en los canales donde el bot es administrador.
    Sirve para interceptar el código de vinculación /link_XXXX y registrar el canal.
    """
    if not update.channel_post or not update.channel_post.text:
        return
        
    text = update.channel_post.text.strip()
    chat = update.channel_post.chat
    
    if text.startswith("/link_"):
        logger.info(f"Recibido posible código de vinculación: {text} en chat {chat.id}")
        code = text.split("_")[1] # El codigo, que sería el UUID del modelo sin guiones
        logger.info(f"Código extraído: {code}")
        
        try:
            # Buscar a la modelo usando el campo ID (que es formato UUID).
            # Para facilitar la bùsqueda dado q le quitamos los guiones en el front, 
            # buscaremos todos y filtraremos en python, o lo reconstruiremos.
            # Reconstruir UUID: 8-4-4-4-12
            if len(code) == 32:
                formatted_uuid = f"{code[:8]}-{code[8:12]}-{code[12:16]}-{code[16:20]}-{code[20:]}"
                logger.info(f"UUID formateado para búsqueda: {formatted_uuid}")
                
                model_data = db.client.table('models').select('id, telegram_id, status').eq('id', formatted_uuid).execute()
                if model_data.data:
                    logger.info(f"Modelo encontrada en BD: {model_data.data[0]}")
                    model = model_data.data[0]
                    # Registrar canal usando service_role para saltar RLS
                    db.service_client.table('channels').upsert({
                        'model_id': model['id'],
                        'telegram_chat_id': str(chat.id),
                        'name': chat.title,
                        'status': 'verifying' # Enviarlo directo a revision
                    }, on_conflict='model_id, telegram_chat_id').execute()
                    
                    logger.info(f"Canal vinculado vía código: {chat.title} ({chat.id}) por modelo_id {model['id']}")
                    
                    # Eliminar el mensaje con el código para no dejar rastro
                    await context.bot.delete_message(chat_id=chat.id, message_id=update.channel_post.message_id)
                    
                    # Notificar a la modelo que fue un exito (usando su telegram_id)
                    await context.bot.send_message(
                        chat_id=model['telegram_id'],
                        text=f"📡 **¡Canal Vinculado Exitosamente!** '{chat.title}'\n\nEl sistema validó tu código secreto. El canal quedará en estado **En Verificación** hasta revisión manual de los administradores.",
                        parse_mode='Markdown'
                    )
                    return
                else:
                    logger.warning(f"No se encontró ninguna modelo con el ID: {formatted_uuid}")
            else:
                logger.warning(f"El código recibido ({code}) no tiene 32 caracteres (length: {len(code)})")

        except Exception as e:
            logger.error(f"Error procesando linking de canal (código {text}): {e}")
    else:
        logger.debug(f"Mensaje ignorado en canal (no es /link_): {text[:20]}...")

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
            
            # Cambiar a verifying para sincronizar con el Panel Admin
            # Usar service_role para saltar RLS
            db.service_client.table('channels').upsert({
                'model_id': model_id,
                'telegram_chat_id': chat.id,
                'name': chat.title,
                'status': 'verifying'
            }, on_conflict='model_id, telegram_chat_id').execute()
            
            # Enviar mensaje al usuario confirmando
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📡 **Canal vinculado:** '{chat.title}'\n\nHe registrado tu canal. Quedará en estado **En Verificación** hasta que nuestro equipo lo revise. Te notificaremos cuando esté activo en el catálogo.",
                parse_mode='Markdown'
            )
            logger.info(f"Nuevo canal registrado: {chat.title} ({chat.id}) por la modelo {model_id}")
            
        elif new_status in ['kicked', 'left']:
            # El bot fue eliminado del canal
            # Marcar el canal como inactivo usando service_role
            db.service_client.table('channels').update({'status': 'inactive'}).eq('telegram_chat_id', chat.id).execute()
            logger.info(f"Bot removido del canal {chat.id}")
            
    except Exception as e:
        logger.error(f"Error procesando my_chat_member: {e}")

def build_app():
    token = os.getenv("PROMO_TELEGRAM_TOKEN")
    if not token:
        logger.error("PROMO_TELEGRAM_TOKEN not found in .env")
        return None

    logger.info("Construyendo Promo Bot...")
    
    async def post_init(application: Application):
        init_scheduler(application.bot)

    app = ApplicationBuilder().token(token).post_init(post_init).build()

    # Handlers
    app.add_handler(CommandHandler("start", start_handler))
    
    # Listener de administración (detectar cuando lo añaden a un canal - opcional ahora pero util)
    app.add_handler(ChatMemberHandler(handle_my_chat_member, ChatMemberHandler.MY_CHAT_MEMBER))
    
    # Listener para posts de canales (para el código de vinculación)
    app.add_handler(MessageHandler(filters.ChatType.CHANNEL & filters.TEXT, handle_channel_post))
    
    # Listener de mensajes en privado (creación de templates)
    # Filtro: cualquier texto o media, que esté en chat privado, que no sea comando
    app.add_handler(MessageHandler(
        filters.ChatType.PRIVATE & ~filters.COMMAND, 
        handle_forwarded_post
    ))

    # Iniciar Cron Jobs de Promociones (SFS, Métricas) a través de post_init

    return app

def main():
    app = build_app()
    if app:
        logger.info("Promo Bot Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
