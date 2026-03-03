import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
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

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

async def get_or_create_sfs_user(user):
    """Obtiene o crea el usuario en sfs_users (Fricción Cero)"""
    telegram_id = user.id
    username = user.username or ""
    full_name = user.full_name or ""
    
    response = db.client.table('sfs_users').select("id").eq("telegram_id", telegram_id).execute()
    if response.data:
        return response.data[0]['id']
    
    # Check si es modelo activa
    is_agency_model = False
    model_response = db.client.table('models').select("id").eq("telegram_id", telegram_id).in_("status", ["active"]).execute()
    if model_response.data:
        is_agency_model = True

    # Crear nuevo sfs_user
    new_user = db.client.table('sfs_users').insert({
        'telegram_id': telegram_id,
        'username': username,
        'full_name': full_name,
        'is_agency_model': is_agency_model
    }).execute()
    
    return new_user.data[0]['id'] if new_user.data else None


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /start. Registra al usuario en sfs_users y muestra la MiniApp.
    """
    if update.effective_chat.type != 'private':
        return
        
    user = update.effective_user
    sfs_user_id = await get_or_create_sfs_user(user)
    
    if not sfs_user_id:
        await update.message.reply_text("❌ Hubo un error al crear tu perfil temporal.")
        return

    LANDING_URL = os.getenv("LANDING_URL", "https://agente-modelos-production.up.railway.app/promotions")

    keyboard = [
        [InlineKeyboardButton("🚀 Abrir SFS MiniApp", web_app=WebAppInfo(url=LANDING_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "✅ **Bienvenido al SFS / PXP Promo Bot.**\n\n"
        "Este es tu perfil para hacer promoción cruzada o vender publicidad.\n\n"
        "**Pasos para Empezar:**\n"
        "1. Añádeme como **Administrador** a tu canal con todos los permisos (enviar, editar, borrar y **añadir usuarios vía enlace**).\n"
        "2. Asegúrate de que tu canal NO tenga restringido el reenvío de mensajes.\n"
        "3. Reenvíame el post publicitario que quieras usar.\n"
        "4. ¡Abre la MiniApp para buscar acuerdos!",
        parse_mode='Markdown',
        reply_markup=reply_markup
    )

async def handle_forwarded_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Captura los mensajes reenviados y los guarda como Plantillas SFS vinculadas al sfs_user.
    """
    if update.effective_chat.type != 'private':
        return

    message = update.message
    user = update.effective_user
    
    sfs_user_id = await get_or_create_sfs_user(user)

    try:
        content_data = message.to_dict()
        if 'from' in content_data: del content_data['from']
        if 'chat' in content_data: del content_data['chat']
        if 'date' in content_data: del content_data['date']

        db.client.table('promo_templates').insert({
            'sfs_user_id': sfs_user_id,
            'telegram_message_id_origin': message.message_id,
            'content_data': content_data
        }).execute()

        await update.message.reply_text(
            "✅ **¡Post guardado exitosamente!**\n\n"
            "Este diseño ha sido guardado en tus Plantillas. Cuando aceptes o propongas un SFS desde la Mini App, este post se publicará exactamente así.",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"Error general en handler_forwarded: {e}")
        await update.message.reply_text("❌ Hubo un error al guardar tu plantilla.")

async def handle_my_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detecta cuando el bot es añadido o removido de un canal.
    Verifica los permisos y la configuración de privacidad (reenvío restringido).
    """
    result = update.my_chat_member
    chat = result.chat
    new_status = result.new_chat_member.status
    
    if chat.type != 'channel':
        return

    try:
        user_id = result.from_user.id
        sfs_user_id = await get_or_create_sfs_user(result.from_user)

        if new_status in ['administrator', 'creator']:
            # Verificar si tiene todos los permisos requeridos
            member = result.new_chat_member
            missing_perms = []
            if not getattr(member, 'can_post_messages', False): missing_perms.append('Publicar Mensajes')
            if not getattr(member, 'can_edit_messages', False): missing_perms.append('Editar Mensajes')
            if not getattr(member, 'can_delete_messages', False): missing_perms.append('Borrar Mensajes')
            if not getattr(member, 'can_invite_users', False): missing_perms.append('Añadir Usuarios (invitar vía enlace)')
            
            if missing_perms:
                await context.bot.send_message(
                    chat_id=user_id,
                    text=f"❌ **Permisos insuficientes en el canal '{chat.title}'**\n\n"
                         f"Faltan los siguientes permisos: {', '.join(missing_perms)}.\n"
                         "Por favor, actualiza los permisos del bot en el canal."
                )
                await context.bot.leave_chat(chat.id)
                return

            # Verificar si tiene 'has_protected_content' (restringir reenviar)
            full_chat = await context.bot.get_chat(chat.id)
            if full_chat.has_protected_content:
                await context.bot.send_message(
                    chat_id=user_id,
                    text=f"❌ **Reenvío Bloqueado en '{chat.title}'**\n\n"
                         "Tu canal tiene bloqueado el reenvío de mensajes. Para usar SFS, debes desactivar esta opción en:\n"
                         "**Editar Canal > Tipo de Canal > Restringir guardar contenido**.\n"
                         "Desactívalo y vuelve a añadirme."
                )
                await context.bot.leave_chat(chat.id)
                return

            # Obtener métricas básicas
            followers = await context.bot.get_chat_member_count(chat.id)
                
            # Upsert channel en estado pending
            db.service_client.table('channels').upsert({
                'sfs_user_id': sfs_user_id,
                'telegram_chat_id': chat.id,
                'name': chat.title,
                'followers': followers,
                'status': 'pending'
            }, on_conflict='telegram_chat_id').execute()
            
            # Enviar mensaje al administrador interno para aprobar (hardcoded admin_id o channel logs)
            ADMIN_LOGS_CHAT_ID = os.getenv("ADMIN_LOGS_CHAT_ID")
            if ADMIN_LOGS_CHAT_ID:
                try:
                    invite_link = await context.bot.create_chat_invite_link(chat_id=chat.id, name="Admin Review Link")
                    await context.bot.send_message(
                        chat_id=ADMIN_LOGS_CHAT_ID,
                        text=f"🔔 **Nuevo Canal a SFS para Revisión**\n"
                             f"**Dueño:** @{result.from_user.username or user_id}\n"
                             f"**Canal:** {chat.title} (ID: {chat.id})\n"
                             f"**Seguidores:** {followers}\n\n"
                             f"👉 **Analizar Contenido:** {invite_link.invite_link}\n\n"
                             f"Ve al panel de control de Supabase para aprobar/rechazar o configurar la categoría."
                    )
                except Exception as link_err:
                    logger.warning(f"No se pudo crear link temporal en canal {chat.title}: {link_err}")
            
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📡 **Canal registrado:** '{chat.title}'\n\n"
                     "El canal cumple todos los requisitos técnicos. Queda en estado **Pendiente de Aprobación**.\n"
                     "Por favor, abre la MiniApp para configurar la categoría de este canal.",
                parse_mode='Markdown'
            )
            
        elif new_status in ['kicked', 'left', 'restricted']:
            db.service_client.table('channels').update({'status': 'inactive'}).eq('telegram_chat_id', chat.id).execute()
            logger.info(f"Bot removido del canal {chat.id}")
            
    except Exception as e:
        logger.error(f"Error procesando my_chat_member: {e}")

async def handle_chat_member_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Rastrea cuando un usuario se une a un canal vía un enlace de invitación Premium.
    Incrementa el contador en promo_campaigns.
    """
    result = update.chat_member
    if not result or not result.invite_link:
        return
        
    old_status = result.old_chat_member.status
    new_status = result.new_chat_member.status
    
    # Solo contar cuando la persona se une efectivamente
    if old_status in ['left', 'kicked'] and new_status == 'member':
        invite_link_url = result.invite_link.invite_link
        
        try:
            # Buscar en db requester_invite_link
            req_data = db.client.table('promo_campaigns').select('id, requester_joined_count').eq('requester_invite_link', invite_link_url).eq('status', 'active').execute()
            if req_data.data:
                campaign_id = req_data.data[0]['id']
                count = req_data.data[0]['requester_joined_count'] + 1
                db.service_client.table('promo_campaigns').update({'requester_joined_count': count}).eq('id', campaign_id).execute()
                logger.info(f"Tracking: +1 (Total {count}) en campaña {campaign_id} (Requester)")
                return
                
            # Buscar en db target_invite_link
            tgt_data = db.client.table('promo_campaigns').select('id, target_joined_count').eq('target_invite_link', invite_link_url).eq('status', 'active').execute()
            if tgt_data.data:
                campaign_id = tgt_data.data[0]['id']
                count = tgt_data.data[0]['target_joined_count'] + 1
                db.service_client.table('promo_campaigns').update({'target_joined_count': count}).eq('id', campaign_id).execute()
                logger.info(f"Tracking: +1 (Total {count}) en campaña {campaign_id} (Target)")
                return
                
        except Exception as e:
            logger.error(f"Error en Tracking Premium join: {e}")

def build_app():
    token = os.getenv("PROMO_TELEGRAM_TOKEN")
    if not token:
        logger.error("PROMO_TELEGRAM_TOKEN not found in .env")
        return None

    logger.info("Construyendo Promo Bot (SFS/PXP)...")
    app = ApplicationBuilder().token(token).build()

    # Handlers
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(ChatMemberHandler(handle_my_chat_member, ChatMemberHandler.MY_CHAT_MEMBER))
    app.add_handler(ChatMemberHandler(handle_chat_member_join, ChatMemberHandler.CHAT_MEMBER))
    app.add_handler(MessageHandler(
        filters.ChatType.PRIVATE & ~filters.COMMAND, 
        handle_forwarded_post
    ))

    return app

def main():
    app = build_app()
    if app:
        logger.info("Promo Bot SFS Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
