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
    CallbackQueryHandler,
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

# ID del admin principal (para notificaciones y comandos de aprobación)
ADMIN_TELEGRAM_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))


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
    Notifica al admin con botones de Aprobar/Rechazar.
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
                         "Por favor, actualiza los permisos del bot en el canal.",
                    parse_mode='Markdown'
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
                         "Desactívalo y vuelve a añadirme.",
                    parse_mode='Markdown'
                )
                await context.bot.leave_chat(chat.id)
                return

            # Obtener métricas básicas
            followers = await context.bot.get_chat_member_count(chat.id)

            # Intentar crear invite link para revisión del admin
            invite_link_url = None
            try:
                invite_link = await context.bot.create_chat_invite_link(chat_id=chat.id, name="Admin Review")
                invite_link_url = invite_link.invite_link
            except Exception as link_err:
                logger.warning(f"No se pudo crear link de invitación para '{chat.title}': {link_err}")
                
            # Upsert channel en estado pending
            db.service_client.table('channels').upsert({
                'sfs_user_id': sfs_user_id,
                'telegram_chat_id': chat.id,
                'name': chat.title,
                'followers': followers,
                'status': 'pending',
                'invite_link': invite_link_url
            }, on_conflict='telegram_chat_id').execute()
            
            # ---- NOTIFICACIÓN AL ADMIN ----
            if ADMIN_TELEGRAM_ID:
                try:
                    review_text = (
                        f"🔔 **Nuevo Canal para Revisión SFS**\n\n"
                        f"👤 **Dueño:** @{result.from_user.username or user_id}\n"
                        f"📺 **Canal:** {chat.title}\n"
                        f"🆔 **Chat ID:** `{chat.id}`\n"
                        f"👥 **Seguidores:** {followers:,}\n"
                    )
                    if invite_link_url:
                        review_text += f"\n🔗 **Inspeccionar:** {invite_link_url}\n"

                    # Botones inline de aprobación
                    keyboard = [
                        [
                            InlineKeyboardButton("✅ Aprobar", callback_data=f"ch_approve:{chat.id}"),
                            InlineKeyboardButton("❌ Rechazar", callback_data=f"ch_reject:{chat.id}")
                        ]
                    ]
                    await context.bot.send_message(
                        chat_id=ADMIN_TELEGRAM_ID,
                        text=review_text,
                        parse_mode='Markdown',
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                except Exception as admin_err:
                    logger.error(f"Error enviando notificación al admin: {admin_err}")
            
            # Notificar al usuario que su canal fue registrado
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📡 **Canal registrado:** '{chat.title}'\n\n"
                     "El canal cumple todos los requisitos técnicos. Queda en estado **Pendiente de Aprobación**.\n"
                     "Te notificaremos cuando un administrador lo revise.\n\n"
                     "Mientras tanto, abre la MiniApp para configurar la categoría de este canal.",
                parse_mode='Markdown'
            )
            
        elif new_status in ['kicked', 'left', 'restricted']:
            db.service_client.table('channels').update({'status': 'inactive'}).eq('telegram_chat_id', chat.id).execute()
            logger.info(f"Bot removido del canal {chat.id}")
            
    except Exception as e:
        logger.error(f"Error procesando my_chat_member: {e}")


# ===========================================================================
#  ADMIN: Callback para Aprobar / Rechazar canales (Botones Inline)
# ===========================================================================

async def handle_channel_approval_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Maneja los callbacks de los botones ✅ Aprobar / ❌ Rechazar
    Format: ch_approve:<chat_id> o ch_reject:<chat_id>
    """
    query = update.callback_query
    await query.answer()

    # Solo el admin puede usar estos botones
    if query.from_user.id != ADMIN_TELEGRAM_ID:
        await query.answer("⛔ No tienes permisos para esta acción.", show_alert=True)
        return

    data = query.data
    action, chat_id_str = data.split(":", 1)
    chat_id = int(chat_id_str)

    try:
        # Obtener el canal de la BD
        channel_res = db.service_client.table('channels').select("*, sfs_users(telegram_id, username)").eq('telegram_chat_id', chat_id).execute()
        if not channel_res.data:
            await query.edit_message_text("⚠️ Canal no encontrado en la base de datos.")
            return

        channel = channel_res.data[0]
        owner_tg_id = channel.get('sfs_users', {}).get('telegram_id')

        if action == "ch_approve":
            # Aprobar canal
            db.service_client.table('channels').update({
                'status': 'active',
                'is_verified': True
            }).eq('telegram_chat_id', chat_id).execute()

            # Editar el mensaje del admin
            await query.edit_message_text(
                f"✅ **Canal Aprobado**\n\n"
                f"📺 {channel['name']} (ID: `{chat_id}`)\n"
                f"👤 @{channel.get('sfs_users', {}).get('username', 'N/A')}\n\n"
                f"El canal ahora aparece en el catálogo público.",
                parse_mode='Markdown'
            )

            # Notificar al dueño
            if owner_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=owner_tg_id,
                        text=f"🎉 **¡Tu canal fue aprobado!**\n\n"
                             f"**{channel['name']}** ya aparece en el catálogo SFS.\n"
                             "Abre la MiniApp para comenzar a recibir propuestas de SFS.",
                        parse_mode='Markdown'
                    )
                except Exception:
                    pass

        elif action == "ch_reject":
            # Rechazar canal
            db.service_client.table('channels').update({
                'status': 'rejected',
                'admin_notes': 'Rechazado por el administrador'
            }).eq('telegram_chat_id', chat_id).execute()

            # Editar el mensaje del admin
            await query.edit_message_text(
                f"❌ **Canal Rechazado**\n\n"
                f"📺 {channel['name']} (ID: `{chat_id}`)\n"
                f"👤 @{channel.get('sfs_users', {}).get('username', 'N/A')}",
                parse_mode='Markdown'
            )

            # Notificar al dueño
            if owner_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=owner_tg_id,
                        text=f"❌ **Tu canal fue rechazado**\n\n"
                             f"**{channel['name']}** no cumple con los requisitos para estar en el catálogo SFS.\n"
                             "Si crees que es un error, contacta al soporte.",
                        parse_mode='Markdown'
                    )
                except Exception:
                    pass

            # Salir del canal rechazado
            try:
                await context.bot.leave_chat(chat_id)
            except Exception:
                pass

    except Exception as e:
        logger.error(f"Error en approval callback: {e}")
        await query.edit_message_text(f"⚠️ Error procesando la solicitud: {str(e)}")


# ===========================================================================
#  ADMIN: Comando /pending — Listar canales pendientes de aprobación
# ===========================================================================

async def pending_channels_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /pending (solo admin). Lista los canales pendientes con botones de aprobación.
    """
    if update.effective_user.id != ADMIN_TELEGRAM_ID:
        await update.message.reply_text("⛔ Este comando es solo para administradores.")
        return

    try:
        res = db.service_client.table('channels').select(
            "*, sfs_users(telegram_id, username, full_name)"
        ).eq('status', 'pending').order('created_at', desc=True).execute()

        channels = res.data or []

        if not channels:
            await update.message.reply_text("✅ No hay canales pendientes de aprobación.")
            return

        await update.message.reply_text(
            f"📋 **Canales Pendientes de Aprobación:** {len(channels)}\n"
            "─────────────────────",
            parse_mode='Markdown'
        )

        for ch in channels:
            sfs_user = ch.get('sfs_users', {}) or {}
            owner_username = sfs_user.get('username', 'N/A')
            owner_name = sfs_user.get('full_name', '')

            text = (
                f"📺 **{ch['name']}**\n"
                f"👤 Dueño: @{owner_username} ({owner_name})\n"
                f"👥 Seguidores: {(ch.get('followers') or 0):,}\n"
                f"📊 ER: {ch.get('engagement_rate', 0)}%\n"
                f"🏷️ Categoría: {ch.get('category') or 'Sin asignar'}\n"
            )
            if ch.get('invite_link'):
                text += f"🔗 Inspeccionar: {ch['invite_link']}\n"

            keyboard = [
                [
                    InlineKeyboardButton("✅ Aprobar", callback_data=f"ch_approve:{ch['telegram_chat_id']}"),
                    InlineKeyboardButton("❌ Rechazar", callback_data=f"ch_reject:{ch['telegram_chat_id']}")
                ]
            ]

            await update.message.reply_text(
                text,
                parse_mode='Markdown',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )

    except Exception as e:
        logger.error(f"Error en /pending: {e}")
        await update.message.reply_text(f"⚠️ Error al consultar canales: {str(e)}")


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
    app.add_handler(CommandHandler("pending", pending_channels_handler))
    app.add_handler(CallbackQueryHandler(handle_channel_approval_callback, pattern=r'^ch_(approve|reject):'))
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
