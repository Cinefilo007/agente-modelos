import os
import sys
import logging
import html as html_lib
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


def e(text):
    """Escapar texto para HTML de Telegram."""
    return html_lib.escape(str(text or ""))


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
    """Comando /start. Registra al usuario en sfs_users y muestra la MiniApp."""
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
        "✅ <b>Bienvenido al SFS / PXP Promo Bot.</b>\n\n"
        "Este es tu perfil para hacer promoción cruzada o vender publicidad.\n\n"
        "<b>Pasos para Empezar:</b>\n"
        "1. Añádeme como <b>Administrador</b> a tu canal con todos los permisos (enviar, editar, borrar y <b>añadir usuarios vía enlace</b>).\n"
        "2. Asegúrate de que tu canal NO tenga restringido el reenvío de mensajes.\n"
        "3. Reenvíame el post publicitario que quieras usar.\n"
        "4. ¡Abre la MiniApp para buscar acuerdos!",
        parse_mode='HTML',
        reply_markup=reply_markup
    )


async def handle_forwarded_post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Captura los mensajes reenviados y los guarda como Plantillas SFS."""
    if update.effective_chat.type != 'private':
        return

    message = update.message
    user = update.effective_user
    sfs_user_id = await get_or_create_sfs_user(user)

    try:
        content_data = message.to_dict()
        for key in ('from', 'chat', 'date'):
            content_data.pop(key, None)

        db.client.table('promo_templates').insert({
            'sfs_user_id': sfs_user_id,
            'telegram_message_id_origin': message.message_id,
            'content_data': content_data
        }).execute()

        await update.message.reply_text(
            "✅ <b>¡Post guardado exitosamente!</b>\n\n"
            "Este diseño ha sido guardado en tus Plantillas. Cuando aceptes o propongas un SFS desde la Mini App, este post se publicará exactamente así.",
            parse_mode='HTML'
        )

    except Exception as ex:
        logger.error(f"Error en handle_forwarded_post: {ex}")
        await update.message.reply_text("❌ Hubo un error al guardar tu plantilla.")


async def handle_my_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Detecta cuando el bot es añadido o removido de un canal.
    Verifica los permisos y la configuración de privacidad.
    Notifica al admin con botones Aprobar / Rechazar.
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
            # Verificar permisos requeridos
            member = result.new_chat_member
            missing_perms = []
            if not getattr(member, 'can_post_messages', False):   missing_perms.append('Publicar Mensajes')
            if not getattr(member, 'can_edit_messages', False):   missing_perms.append('Editar Mensajes')
            if not getattr(member, 'can_delete_messages', False): missing_perms.append('Borrar Mensajes')
            if not getattr(member, 'can_invite_users', False):    missing_perms.append('Añadir Usuarios (invitar vía enlace)')

            if missing_perms:
                await context.bot.send_message(
                    chat_id=user_id,
                    text=f"❌ <b>Permisos insuficientes en el canal '{e(chat.title)}'</b>\n\n"
                         f"Faltan los siguientes permisos: {e(', '.join(missing_perms))}.\n"
                         "Por favor, actualiza los permisos del bot en el canal.",
                    parse_mode='HTML'
                )
                await context.bot.leave_chat(chat.id)
                return

            # Verificar restricción de reenvío
            full_chat = await context.bot.get_chat(chat.id)
            if full_chat.has_protected_content:
                await context.bot.send_message(
                    chat_id=user_id,
                    text=f"❌ <b>Reenvío Bloqueado en '{e(chat.title)}'</b>\n\n"
                         "Tu canal tiene bloqueado el reenvío de mensajes. Para usar SFS, debes desactivar esta opción en:\n"
                         "<b>Editar Canal &gt; Tipo de Canal &gt; Restringir guardar contenido</b>.\n"
                         "Desactívalo y vuelve a añadirme.",
                    parse_mode='HTML'
                )
                await context.bot.leave_chat(chat.id)
                return

            # Métricas básicas
            followers = await context.bot.get_chat_member_count(chat.id)

            # Invite link para revisión del admin
            invite_link_url = None
            try:
                invite_link = await context.bot.create_chat_invite_link(chat_id=chat.id, name="Admin Review")
                invite_link_url = invite_link.invite_link
            except Exception as link_err:
                logger.warning(f"No se pudo crear link para '{chat.title}': {link_err}")

            # Guardar canal en estado pending
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
                    owner = e(result.from_user.username or str(user_id))
                    review_text = (
                        f"🔔 <b>Nuevo Canal para Revisión SFS</b>\n\n"
                        f"👤 <b>Dueño:</b> @{owner}\n"
                        f"📺 <b>Canal:</b> {e(chat.title)}\n"
                        f"🆔 <b>Chat ID:</b> <code>{chat.id}</code>\n"
                        f"👥 <b>Seguidores:</b> {followers:,}\n"
                    )
                    if invite_link_url:
                        review_text += f"\n🔗 <b>Inspeccionar:</b> {invite_link_url}\n"

                    keyboard = [[
                        InlineKeyboardButton("✅ Aprobar", callback_data=f"ch_approve:{chat.id}"),
                        InlineKeyboardButton("❌ Rechazar", callback_data=f"ch_reject:{chat.id}")
                    ]]
                    await context.bot.send_message(
                        chat_id=ADMIN_TELEGRAM_ID,
                        text=review_text,
                        parse_mode='HTML',
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                except Exception as admin_err:
                    logger.error(f"Error enviando notificación al admin: {admin_err}")

            # Confirmar al usuario
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📡 <b>Canal registrado:</b> '{e(chat.title)}'\n\n"
                     "El canal cumple todos los requisitos técnicos. Queda en estado <b>Pendiente de Aprobación</b>.\n"
                     "Te notificaremos cuando un administrador lo revise.\n\n"
                     "Mientras tanto, abre la MiniApp para configurar la categoría de este canal.",
                parse_mode='HTML'
            )

        elif new_status in ['kicked', 'left', 'restricted']:
            db.service_client.table('channels').update({'status': 'inactive'}).eq('telegram_chat_id', chat.id).execute()
            logger.info(f"Bot removido del canal {chat.id}")

    except Exception as ex:
        logger.error(f"Error procesando my_chat_member: {ex}")


# ===========================================================================
#  ADMIN: Callbacks para Aprobar / Rechazar (Botones Inline)
# ===========================================================================

async def handle_channel_approval_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Maneja ch_approve:<chat_id> y ch_reject:<chat_id>
    """
    query = update.callback_query
    await query.answer()

    if query.from_user.id != ADMIN_TELEGRAM_ID:
        await query.answer("⛔ No tienes permisos para esta acción.", show_alert=True)
        return

    action, chat_id_str = query.data.split(":", 1)
    chat_id = int(chat_id_str)

    try:
        channel_res = db.service_client.table('channels').select(
            "*, sfs_users(telegram_id, username)"
        ).eq('telegram_chat_id', chat_id).execute()

        if not channel_res.data:
            await query.edit_message_text("⚠️ Canal no encontrado en la base de datos.")
            return

        channel = channel_res.data[0]
        sfs_user_info = channel.get('sfs_users') or {}
        owner_tg_id = sfs_user_info.get('telegram_id')
        owner_uname = e(sfs_user_info.get('username', 'N/A'))
        ch_name = e(channel.get('name', ''))

        if action == "ch_approve":
            db.service_client.table('channels').update({
                'status': 'active',
                'is_verified': True
            }).eq('telegram_chat_id', chat_id).execute()

            await query.edit_message_text(
                f"✅ <b>Canal Aprobado</b>\n\n"
                f"📺 {ch_name}\n"
                f"👤 @{owner_uname}\n\n"
                "El canal ahora aparece en el catálogo público.",
                parse_mode='HTML'
            )

            if owner_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=owner_tg_id,
                        text=f"🎉 <b>¡Tu canal fue aprobado!</b>\n\n"
                             f"<b>{ch_name}</b> ya aparece en el catálogo SFS.\n"
                             "Abre la MiniApp para comenzar a recibir propuestas.",
                        parse_mode='HTML'
                    )
                except Exception:
                    pass

        elif action == "ch_reject":
            db.service_client.table('channels').update({
                'status': 'rejected',
                'admin_notes': 'Rechazado por el administrador'
            }).eq('telegram_chat_id', chat_id).execute()

            await query.edit_message_text(
                f"❌ <b>Canal Rechazado</b>\n\n"
                f"📺 {ch_name}\n"
                f"👤 @{owner_uname}",
                parse_mode='HTML'
            )

            if owner_tg_id:
                try:
                    await context.bot.send_message(
                        chat_id=owner_tg_id,
                        text=f"❌ <b>Tu canal fue rechazado</b>\n\n"
                             f"<b>{ch_name}</b> no cumple con los requisitos para estar en el catálogo SFS.\n"
                             "Si crees que es un error, contacta al soporte.",
                        parse_mode='HTML'
                    )
                except Exception:
                    pass

            try:
                await context.bot.leave_chat(chat_id)
            except Exception:
                pass

    except Exception as ex:
        logger.error(f"Error en approval callback: {ex}")
        await query.edit_message_text(f"⚠️ Error procesando la solicitud: {e(str(ex))}")


# ===========================================================================
#  ADMIN: Comando /pending — Listar canales pendientes
# ===========================================================================

async def pending_channels_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /pending (solo admin). Lista canales pendientes con botones de aprobación.
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
            f"📋 <b>Canales Pendientes:</b> {len(channels)}",
            parse_mode='HTML'
        )

        for ch in channels:
            sfs_user = ch.get('sfs_users') or {}
            owner_username = e(sfs_user.get('username', 'N/A'))
            owner_name = e(sfs_user.get('full_name', ''))
            ch_name = e(ch.get('name', 'Sin nombre'))
            followers = ch.get('followers') or 0
            er = ch.get('engagement_rate') or 0
            category = e(ch.get('category') or 'Sin asignar')

            text = (
                f"📺 <b>{ch_name}</b>\n"
                f"👤 @{owner_username} ({owner_name})\n"
                f"👥 Seguidores: {followers:,}\n"
                f"📊 ER: {er}%\n"
                f"🏷️ Categoría: {category}\n"
            )
            if ch.get('invite_link'):
                text += f"🔗 <a href=\"{ch['invite_link']}\">Inspeccionar canal</a>\n"

            keyboard = [[
                InlineKeyboardButton("✅ Aprobar", callback_data=f"ch_approve:{ch['telegram_chat_id']}"),
                InlineKeyboardButton("❌ Rechazar", callback_data=f"ch_reject:{ch['telegram_chat_id']}")
            ]]

            await update.message.reply_text(
                text,
                parse_mode='HTML',
                reply_markup=InlineKeyboardMarkup(keyboard),
                disable_web_page_preview=True
            )

    except Exception as ex:
        logger.error(f"Error en /pending: {ex}")
        await update.message.reply_text(f"⚠️ Error al consultar canales: {e(str(ex))}")


async def handle_chat_member_join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Rastrea uniones a través de enlaces de invitación Premium.
    """
    result = update.chat_member
    if not result or not result.invite_link:
        return

    old_status = result.old_chat_member.status
    new_status = result.new_chat_member.status

    if old_status in ['left', 'kicked'] and new_status == 'member':
        invite_link_url = result.invite_link.invite_link

        try:
            req_data = db.client.table('promo_campaigns').select(
                'id, requester_joined_count'
            ).eq('requester_invite_link', invite_link_url).eq('status', 'active').execute()

            if req_data.data:
                campaign_id = req_data.data[0]['id']
                count = req_data.data[0]['requester_joined_count'] + 1
                db.service_client.table('promo_campaigns').update(
                    {'requester_joined_count': count}
                ).eq('id', campaign_id).execute()
                logger.info(f"Tracking +1 (total {count}) en campaña {campaign_id} (Requester)")
                return

            tgt_data = db.client.table('promo_campaigns').select(
                'id, target_joined_count'
            ).eq('target_invite_link', invite_link_url).eq('status', 'active').execute()

            if tgt_data.data:
                campaign_id = tgt_data.data[0]['id']
                count = tgt_data.data[0]['target_joined_count'] + 1
                db.service_client.table('promo_campaigns').update(
                    {'target_joined_count': count}
                ).eq('id', campaign_id).execute()
                logger.info(f"Tracking +1 (total {count}) en campaña {campaign_id} (Target)")

        except Exception as ex:
            logger.error(f"Error en tracking join: {ex}")


def build_app():
    token = os.getenv("PROMO_TELEGRAM_TOKEN")
    if not token:
        logger.error("PROMO_TELEGRAM_TOKEN not found in .env")
        return None

    logger.info("Construyendo Promo Bot (SFS/PXP)...")
    app = ApplicationBuilder().token(token).build()

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
