import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import html as html_lib
from datetime import datetime
from telegram.error import TelegramError
import httpx
import re
from apscheduler.triggers.interval import IntervalTrigger
from telegram import Bot

from src.services.database import db
from src.services.storage import delete_file

logger = logging.getLogger(__name__)

async def get_recent_channel_views(username: str) -> int:
    """Extrae las vistas promedio de las últimas 10 publicaciones de un canal público vía HTTPS."""
    return await extract_views_from_html(f"https://t.me/s/{username}", is_single=False)

async def get_single_message_views(username: str, message_id: int) -> int:
    """Extrae las vistas de un solo mensaje reenviado usando su widget embed."""
    return await extract_views_from_html(f"https://t.me/{username}/{message_id}?embed=1", is_single=True)

async def extract_views_from_html(url: str, is_single: bool) -> int:
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, follow_redirects=True, timeout=10.0)
            if resp.status_code == 200:
                html = resp.text
                matches = re.findall(r'<span class="tgme_widget_message_views">(.*?)</span>', html)
                if not matches:
                    return 0
                
                total_views = 0
                count = 0
                target_matches = [matches[-1]] if is_single else matches[-10:]
                
                for m in target_matches:
                    v_str = m.strip().replace(',', '')
                    if 'K' in v_str:
                        views = int(float(v_str.replace('K', '')) * 1000)
                    elif 'M' in v_str:
                        views = int(float(v_str.replace('M', '')) * 1000000)
                    else:
                        views = int(v_str)
                    total_views += views
                    count += 1
                
                if count > 0:
                    return int(total_views / count)
    except Exception as e:
        logger.warning(f"Error scraping views from {url}: {e}")
    return 0

async def cleanup_expired_stories(bot: Bot):
    """
    Busca historias que expiraron hace más de su fecha límite y que
    no están marcadas como guardadas (is_saved = false). 
    Las borra de la DB y elimina su multimedia en Storage.
    """
    logger.info("Iniciando tarea de limpieza de Historias Expiradas...")
    try:
        now_utc = datetime.utcnow().isoformat()
        
        # En Supabase no podemos hacer Delete con Returning directamente en un query tan fácil a veces.
        # Primero las consultamos:
        # expires_at < now Y is_saved IS NOT TRUE
        response = db.service_client.table('stories').select('id, media_url, is_saved') \
            .lt('expires_at', now_utc) \
            .execute()
            
        expired_stories = [s for s in response.data if not s.get('is_saved', False)]
        
        if not expired_stories:
            logger.info("No hay historias no guardadas y expiradas que limpiar.")
            return

        deleted_count = 0
        for story in expired_stories:
            story_id = story['id']
            media_url = story.get('media_url')
            
            # 1. Delete Storage File
            if media_url:
                url_parts = media_url.split('/')
                if 'stories' in url_parts:
                    idx = url_parts.index('stories')
                    relative_path = "/".join(url_parts[idx+1:])
                    delete_file("stories", relative_path)
            
            # 2. Delete DB Entry
            db.service_client.table('stories').delete().eq('id', story_id).execute()
            deleted_count += 1
            
        logger.info(f"Limpieza finalizada. Eliminadas {deleted_count} historias caducadas (Storage + DB).")
        
    except Exception as e:
        logger.error(f"Error procesando cleanup_expired_stories: {e}")

async def evaluate_channels_quality(bot):
    """
    Job programado (cada 6 horas).
    - Busca canales en status 'verifying' o 'active'
    - Actualiza el 'followers' consultando la API de Telegram.
    - Calcula ER base.
    """
    logger.info("Executing Job: Evaluate Channels Quality (Actualizando métricas SFS)")
    try:
        # Usamos service_client para asegurar lectura sin problemas de RLS
        channels_res = db.service_client.table('channels').select('*').in_('status', ['verifying', 'active']).execute()
        for channel in channels_res.data:
            try:
                # Obtener detalles completos del chat
                chat = await bot.get_chat(chat_id=channel['telegram_chat_id'])
                count = await bot.get_chat_member_count(chat_id=channel['telegram_chat_id'])
                
                # 1. Definir link de invitación
                invite_link = channel.get('invite_link')
                if chat.username:
                    invite_link = f"https://t.me/{chat.username}"
                else:
                    try:
                        # Para privados extraemos un enlace temporal si es posible
                        invite_link = chat.invite_link or await chat.export_invite_link()
                    except:
                        pass
                
                # 2. Calcular ER usando scraping real si es público, o base de 15% si es privado
                estimated_avg_views = int(count * 0.15) 
                if chat.username:
                    scraped_views = await get_recent_channel_views(chat.username)
                    if scraped_views > 0:
                        estimated_avg_views = scraped_views
                else:
                    # Canal Privado -> Usar Dump Channel Scraper
                    recent_posts = db.service_client.table('channel_metrics_tracker') \
                        .select('telegram_message_id, id') \
                        .eq('channel_id', channel['id']) \
                        .order('created_at', desc=True) \
                        .limit(10) \
                        .execute()
                    
                    if recent_posts.data:
                        total_private_views = 0
                        valid_posts_count = 0
                        
                        dump_channel = "@nebula_dumper"
                        for post in recent_posts.data:
                            try:
                                fwd = await bot.forward_message(
                                    chat_id=dump_channel, 
                                    from_chat_id=chat.id, 
                                    message_id=post['telegram_message_id']
                                )
                                # Scrapear views del dump
                                views = await get_single_message_views("nebula_dumper", fwd.message_id)
                                if views > 0:
                                    total_private_views += views
                                    valid_posts_count += 1
                                    
                                # Borrar del dump
                                await bot.delete_message(chat_id=dump_channel, message_id=fwd.message_id)
                                
                            except Exception as fwd_err:
                                error_str = str(fwd_err).lower()
                                if "protected content" in error_str or "can't be forwarded" in error_str:
                                    # CANAL RESTRINGIDO
                                    logger.warning(f"Cierre por privacidad: Canal {chat.title} restringe envíos.")
                                    # Desactivar canal
                                    db.service_client.table('channels').update({'status': 'inactive'}).eq('id', channel['id']).execute()
                                    
                                    # Obtener telegram_id de la modelo para notificarla
                                    model_data = db.service_client.table('models').select('telegram_id').eq('id', channel['model_id']).execute()
                                    if model_data.data:
                                        await bot.send_message(
                                            chat_id=model_data.data[0]['telegram_id'],
                                            text=f"⚠️ **Atención sobre tu canal '{chat.title}'**\n\n"
                                                 "Tu canal ha sido ocultado del catálogo SFS porque tiene habilitada la opción **'Restringir guardar contenido'**.\n"
                                                 "Esto le impide al bot medir el impacto y vistas reales de tus posts privados.\n\n"
                                                 "**Para arreglarlo:**\n"
                                                 "1. Ve a los Ajustes de tu Canal -> Tipo de Canal -> **Desactiva** 'Restringir guardar contenido'.\n"
                                                 "2. Vuelve a registrar tu canal enviando el código `/link_...`\n"
                                                 "3. ¡El bot confirmará y tu canal volverá a estar activo!",
                                            parse_mode='Markdown'
                                        )
                                    # Evitar seguir procesando este canal
                                    break
                                elif "message to forward not found" in error_str or "message not found" in error_str:
                                    # Msj borrado, simplemente ignorar
                                    pass
                        
                        if valid_posts_count > 0:
                            estimated_avg_views = int(total_private_views / valid_posts_count)
                            
                estimated_er = round((estimated_avg_views / max(count, 1)) * 100, 2)
                
                # Si el canal fue desactivado en el bloque `except`, saltamos la actualización.
                ch_check = db.service_client.table('channels').select('status').eq('id', channel['id']).execute()
                if ch_check.data and ch_check.data[0]['status'] != 'inactive':
                    db.service_client.table('channels').update({
                        'followers': count,
                        'avg_views': estimated_avg_views,
                        'engagement_rate': estimated_er,
                        'invite_link': invite_link
                        # IMPORTANTE: No modificar el status aquí, dejarlo igual (active o verifying)
                    }).eq('id', channel['id']).execute()
                    
                    # Registrar historial de métricas
                    db.service_client.table('channel_metrics_history').insert({
                        'channel_id': channel['id'],
                        'followers': count,
                        'avg_views': estimated_avg_views,
                        'engagement_rate': estimated_er
                    }).execute()
                
            except TelegramError as e:
                logger.warning(f"No se pudo acceder al canal {channel['telegram_chat_id']} ({channel['name']}): {e}")
                # Remover canal si el bot fue expulsado o el canal no existe
                if 'chat not found' in str(e).lower() or 'kicked' in str(e).lower() or 'not a member' in str(e).lower():
                    db.service_client.table('channels').update({'status': 'inactive'}).eq('id', channel['id']).execute()
    except Exception as e:
        logger.error(f"Error evaluando calidad de canales: {e}")

async def publish_sfs_campaigns(bot):
    """
    Job programado (ej. Cada minuto).
    Busca campañas aprobadas cuyo start_time ya pasó y publica cruzado.
    """
    logger.info("Executing Job: Publish SFS Campaigns")
    try:
        now_iso = datetime.utcnow().isoformat()
        campaigns_res = db.service_client.table('promo_campaigns').select(
            '*, requester_template:promo_templates!requester_template_id(*), target_template:promo_templates!target_template_id(*)'
        ).eq('status', 'accepted').lte('start_time', now_iso).execute()

        for camp in campaigns_res.data:
            # 1. Obtener los canales vinculados a requester y target
            req_channels = db.service_client.table('channels').select('*').eq('sfs_user_id', camp['requester_id']).eq('status', 'active').execute()
            tgt_channels = db.service_client.table('channels').select('*').eq('sfs_user_id', camp['target_id']).eq('status', 'active').execute()

            if not req_channels.data or not tgt_channels.data:
                logger.warning(f"Campaña {camp['id']} fallida: Uno de los usuarios no tiene canal activo.")
                continue

            req_channel = req_channels.data[0]
            tgt_channel = tgt_channels.data[0]

            req_template = camp['requester_template']
            tgt_template = camp['target_template']

            # ── Verificar que ambos templates existen ──
            missing_user_id = None
            if not req_template:
                missing_user_id = camp['requester_id']
                logger.warning(f"Campaña {camp['id']}: requester no tiene template. Cancelando.")
            elif not tgt_template:
                missing_user_id = camp['target_id']
                logger.warning(f"Campaña {camp['id']}: target no tiene template. Cancelando.")

            if missing_user_id:
                db.service_client.table('promo_campaigns').update({
                    'status': 'failed'
                }).eq('id', camp['id']).execute()
                # Notificar al usuario que le falta post
                try:
                    missing_user = db.service_client.table('sfs_users').select(
                        'telegram_id'
                    ).eq('id', missing_user_id).execute()
                    tg_id = missing_user.data[0].get('telegram_id') if missing_user.data else None
                    if tg_id:
                        await bot.send_message(
                            chat_id=tg_id,
                            text=(
                                "⚠️ <b>Campaña SFS cancelada</b>\n\n"
                                "No tienes ningún post guardado para publicar en el canal de tu contraparte.\n\n"
                                "📌 Para poder hacer SFS necesitas guardar al menos un post: "
                                "reenvía tu mejor foto/video con emojis a @Nebula_sfs_bot en Telegram.\n\n"
                                "Luego vuelve al <a href='https://agente-modelos-production.up.railway.app/promotions'>Promo Center</a> para iniciar una nueva colaboración."
                            ),
                            parse_mode="HTML"
                        )
                except Exception as notify_err:
                    logger.warning(f"[notify] No se pudo notificar template faltante: {notify_err}")
                continue

            # Obtener telegram_id de ambos usuarios (necesario para copy_message)
            users_tg_res = db.service_client.table('sfs_users').select(
                'id, telegram_id'
            ).in_('id', [camp['requester_id'], camp['target_id']]).execute()
            users_tg_map = {u['id']: u['telegram_id'] for u in (users_tg_res.data or [])}
            req_tg_id = users_tg_map.get(camp['requester_id'])
            tgt_tg_id = users_tg_map.get(camp['target_id'])

            if not req_tg_id or not tgt_tg_id:
                logger.warning(f"Campaña {camp['id']}: telegram_id no encontrado para req={req_tg_id} tgt={tgt_tg_id}. Saltando.")
                continue

            logger.info(
                f"[publish] camp={camp['id']} "
                f"req_tg={req_tg_id} tgt_tg={tgt_tg_id} "
                f"req_ch={req_channel['telegram_chat_id']} tgt_ch={tgt_channel['telegram_chat_id']} "
                f"req_msg={req_template['telegram_message_id_origin']} tgt_msg={tgt_template['telegram_message_id_origin']}"
            )

            # ── Marcar como 'active' ANTES de publicar para evitar el bucle ──
            # Si el job falla a la mitad, la próxima ejecución no lo reprocesará
            db.service_client.table('promo_campaigns').update(
                {'status': 'active'}
            ).eq('id', camp['id']).eq('status', 'accepted').execute()

            # Enviar el template del TARGET al canal del REQUESTER
            try:
                # copy_message: el mensaje origen está en el chat privado del usuario con el bot
                msg1 = await bot.copy_message(
                    chat_id=req_channel['telegram_chat_id'],
                    from_chat_id=tgt_tg_id,
                    message_id=tgt_template['telegram_message_id_origin']
                )

                # Enviar el template del REQUESTER al canal del TARGET
                msg2 = await bot.copy_message(
                    chat_id=tgt_channel['telegram_chat_id'],
                    from_chat_id=req_tg_id,
                    message_id=req_template['telegram_message_id_origin']
                )

                # Guardar los IDs de los posts publicados
                db.service_client.table('promo_posts').insert([
                    {
                        'campaign_id': camp['id'],
                        'channel_id': req_channel['id'],
                        'telegram_message_id': msg1.message_id,
                        'current_views': 0
                    },
                    {
                        'campaign_id': camp['id'],
                        'channel_id': tgt_channel['id'],
                        'telegram_message_id': msg2.message_id,
                        'current_views': 0
                    }
                ]).execute()

                logger.info(f"Campaña {camp['id']} activada → posts {msg1.message_id} y {msg2.message_id}")

                # ── Notificar a ambas partes que el SFS comenzó ──
                users_res = db.service_client.table('sfs_users').select(
                    'id, telegram_id'
                ).in_('id', [camp['requester_id'], camp['target_id']]).execute()
                users_map = {u['id']: u for u in (users_res.data or [])}
                promo_url = "https://agente-modelos-production.up.railway.app/promotions"
                t = camp.get("type", "")
                if t == "SFS_VIEWS":
                    goal_txt = f"{camp.get('views_target', '?'):,} vistas"
                elif t == "SFS_TIME":
                    goal_txt = f"{camp.get('duration_hours', '?')}h de exposición"
                elif t == "SFS_FOLLOWERS":
                    goal_txt = f"{camp.get('followers_target', '?'):,} subs nuevos"
                else:
                    goal_txt = t

                for uid in [camp['requester_id'], camp['target_id']]:
                    u = users_map.get(uid, {})
                    tg_id = u.get('telegram_id')
                    if not tg_id:
                        continue
                    try:
                        await bot.send_message(
                            chat_id=tg_id,
                            text=(
                                f"🚀 <b>¡Tu SFS está activo!</b>\n"
                                f"📋 Contrato: <b>{goal_txt}</b>\n"
                                f"🤖 Posts publicados en ambos canales. El bot monitorea automáticamente.\n\n"
                                f"<a href='{promo_url}'>Ver métricas en vivo →</a>"
                            ),
                            parse_mode="HTML"
                        )
                    except Exception as notify_err:
                        logger.warning(f"[notify] activo → {tg_id}: {notify_err}")

            except Exception as e:
                logger.error(f"Error publicando cruzado para campaña {camp['id']}: {e}")
                # Revertir a 'accepted' para reintentar en el próximo ciclo
                db.service_client.table('promo_campaigns').update(
                    {'status': 'accepted'}
                ).eq('id', camp['id']).execute()

    except Exception as e:
        logger.error(f"Error en publish_sfs_campaigns: {e}")



async def monitor_sfs_views_and_fraud(bot):
    """
    Job cada 5 minutos.
    1. pending_deletion → eliminar posts y marcar completed.
    2. active → verificar que los posts siguen publicados (fraude).
       2a. SFS_VIEWS : sumar vistas de ambos posts y comparar con meta.
       2b. SFS_TIME  : comprobar si start_time + duration_hours ya expiró.
       2c. SFS_FOLLOWERS: comparar followers actuales del canal con snapshot inicial.
    """
    logger.info("Executing Job: Monitor SFS Views & Fraud")
    promo_url = "https://agente-modelos-production.up.railway.app/promotions"

    async def _complete_campaign(camp_id, requester_id, target_id, reason: str):
        """Marca pending_deletion, notifica y da +5 trust."""
        db.service_client.table('promo_campaigns').update(
            {'status': 'pending_deletion'}
        ).eq('id', camp_id).execute()
        users_res = db.service_client.table('sfs_users').select(
            'id, telegram_id'
        ).in_('id', [requester_id, target_id]).execute()
        for u in (users_res.data or []):
            tg_id = u.get('telegram_id')
            if not tg_id:
                continue
            try:
                await bot.send_message(
                    chat_id=tg_id,
                    text=(
                        f"🎯 <b>¡Meta alcanzada!</b>\n\n"
                        f"📋 {reason}\n\n"
                        "✅ El contrato se ha <b>completado exitosamente</b>.\n"
                        "⏳ Los posts serán eliminados en el próximo ciclo.\n\n"
                        f"<a href='{promo_url}'>Ver historial →</a>"
                    ),
                    parse_mode='HTML'
                )
            except Exception as n_err:
                logger.warning(f"[notify] complete → {tg_id}: {n_err}")

    async def _fraud_campaign(camp_id, requester_id, target_id, offender_channel_id: str):
        """Marca cancelled_fraud y penaliza solo al canal infractor."""
        db.service_client.table('promo_campaigns').update(
            {'status': 'cancelled_fraud'}
        ).eq('id', camp_id).execute()
        # Encontrar el sfs_user_id del canal infractor
        ch_res = db.service_client.table('channels').select('sfs_user_id').eq('id', offender_channel_id).execute()
        offender_sfs_id = ch_res.data[0]['sfs_user_id'] if ch_res.data else None
        if offender_sfs_id:
            u = db.service_client.table('sfs_users').select('trust_score, telegram_id').eq('id', offender_sfs_id).execute()
            if u.data:
                new_score = max(0, (u.data[0].get('trust_score') or 80) - 20)
                db.service_client.table('sfs_users').update({'trust_score': new_score}).eq('id', offender_sfs_id).execute()
                tg_id = u.data[0].get('telegram_id')
                if tg_id:
                    try:
                        await bot.send_message(
                            chat_id=tg_id,
                            text=(
                                "🚨 <b>Campaña SFS cancelada por fraude</b>\n\n"
                                "Detectamos que eliminaste el post antes de que se completara el contrato.\n"
                                f"❌ Tu Trust Score bajó 20 puntos.\n\n"
                                f"<a href='{promo_url}'>Ver detalle →</a>"
                            ),
                            parse_mode='HTML'
                        )
                    except Exception:
                        pass
        # Notificar a la parte inocente
        innocent_id = target_id if offender_sfs_id == requester_id else requester_id
        innocent_res = db.service_client.table('sfs_users').select('telegram_id').eq('id', innocent_id).execute()
        if innocent_res.data and innocent_res.data[0].get('telegram_id'):
            try:
                await bot.send_message(
                    chat_id=innocent_res.data[0]['telegram_id'],
                    text=(
                        "⚠️ <b>Tu campaña SFS fue cancelada</b>\n\n"
                        "La contraparte eliminó su post antes de tiempo. Se registró como fraude en su perfil.\n"
                        f"<a href='{promo_url}'>Ver tus campañas →</a>"
                    ),
                    parse_mode='HTML'
                )
            except Exception:
                pass

    try:
        active_camps_res = db.service_client.table('promo_campaigns').select(
            '*'
        ).in_('status', ['active', 'pending_deletion']).execute()

        for camp in active_camps_res.data or []:
            posts_res = db.service_client.table('promo_posts').select(
                'id, channel_id, telegram_message_id, current_views'
            ).eq('campaign_id', camp['id']).execute()
            posts = posts_res.data or []
            camp_id = camp['id']

            # ----------------------------------------------------------------
            # FASE 1: pending_deletion → borrar posts y completar
            # ----------------------------------------------------------------
            if camp['status'] == 'pending_deletion':
                for post in posts:
                    ch_res = db.service_client.table('channels').select('telegram_chat_id').eq('id', post['channel_id']).execute()
                    if not ch_res.data:
                        continue
                    try:
                        await bot.delete_message(
                            chat_id=ch_res.data[0]['telegram_chat_id'],
                            message_id=post['telegram_message_id']
                        )
                    except Exception as del_err:
                        logger.warning(f"[delete] post {post['telegram_message_id']}: {del_err}")

                db.service_client.table('promo_campaigns').update({'status': 'completed'}).eq('id', camp_id).execute()
                for uid in [camp['requester_id'], camp['target_id']]:
                    u = db.service_client.table('sfs_users').select('trust_score').eq('id', uid).execute()
                    if u.data:
                        new_score = min(100, (u.data[0].get('trust_score') or 80) + 5)
                        db.service_client.table('sfs_users').update({'trust_score': new_score}).eq('id', uid).execute()
                logger.info(f"[monitor] Campaña {camp_id} completada.")
                continue

            if not posts:
                logger.warning(f"[monitor] Campaña {camp_id} activa sin posts. Saltando.")
                continue

            # ----------------------------------------------------------------
            # FASE 2: Verificar que los posts siguen publicados (fraude)
            # Método: intentar copiar el mensaje al propio chat del bot (ID negativo)
            # Si falla con "message not found" → fraude detectado
            # ----------------------------------------------------------------
            for post in posts:
                ch_res = db.service_client.table('channels').select('telegram_chat_id').eq('id', post['channel_id']).execute()
                if not ch_res.data:
                    continue
                chat_id_tg = ch_res.data[0]['telegram_chat_id']
                try:
                    # get_chat + forwardMessage al propio bot es la forma más fiable de verificar
                    await bot.forward_message(
                        chat_id=bot.id if hasattr(bot, 'id') else chat_id_tg,
                        from_chat_id=chat_id_tg,
                        message_id=post['telegram_message_id'],
                        disable_notification=True
                    )
                except Exception as fwd_err:
                    err_lower = str(fwd_err).lower()
                    if any(k in err_lower for k in ['message to forward not found', 'message_id_invalid', 'not found']):
                        logger.warning(f"[fraude] Campaña {camp_id}: post {post['telegram_message_id']} eliminado prematuramente.")
                        await _fraud_campaign(camp_id, camp['requester_id'], camp['target_id'], post['channel_id'])
                        break  # No seguir evaluando esta campaña
                    # Otro error (rate limit, etc.) — ignorar

            # Re-leer estado por si acaso se marcó como fraud
            camp_status_res = db.service_client.table('promo_campaigns').select('status').eq('id', camp_id).execute()
            if camp_status_res.data and camp_status_res.data[0]['status'] != 'active':
                continue

            # ----------------------------------------------------------------
            # FASE 3: Verificar cumplimiento según tipo de contrato
            # ----------------------------------------------------------------
            camp_type = camp.get('type')

            # ── SFS_VIEWS ──
            if camp_type == 'SFS_VIEWS' and camp.get('views_target'):
                views_target = camp['views_target']
                total_views = 0

                for post in posts:
                    ch_res = db.service_client.table('channels').select('telegram_chat_id').eq('id', post['channel_id']).execute()
                    if not ch_res.data:
                        continue
                    try:
                        chat_obj = await bot.get_chat(ch_res.data[0]['telegram_chat_id'])
                        if chat_obj.username:
                            views = await get_single_message_views(chat_obj.username, post['telegram_message_id'])
                            total_views += views
                            # Actualizar vistas en DB para el frontend
                            db.service_client.table('promo_posts').update(
                                {'current_views': views}
                            ).eq('id', post['id']).execute()
                    except Exception as v_err:
                        logger.warning(f"[views] post {post['telegram_message_id']}: {v_err}")

                logger.info(f"[monitor] Campaña {camp_id} SFS_VIEWS: {total_views}/{views_target} vistas")
                if total_views >= views_target:
                    await _complete_campaign(
                        camp_id, camp['requester_id'], camp['target_id'],
                        f"Tu campaña alcanzó las <b>{views_target:,} vistas</b> acordadas."
                    )

            # ── SFS_TIME ──
            elif camp_type == 'SFS_TIME' and camp.get('start_time') and camp.get('duration_hours'):
                from datetime import timezone as tz
                start = datetime.fromisoformat(camp['start_time'].replace('Z', '+00:00'))
                duration_h = camp['duration_hours']
                end_time = start + timedelta(hours=duration_h)
                now_utc = datetime.now(tz.utc)
                if now_utc >= end_time:
                    logger.info(f"[monitor] Campaña {camp_id} SFS_TIME expirada.")
                    await _complete_campaign(
                        camp_id, camp['requester_id'], camp['target_id'],
                        f"Tu campaña de <b>{duration_h}h</b> de exposición ha completado su tiempo."
                    )
                else:
                    remaining = end_time - now_utc
                    h_left = int(remaining.total_seconds() // 3600)
                    logger.info(f"[monitor] Campaña {camp_id} SFS_TIME: {h_left}h restantes")

            # ── SFS_FOLLOWERS ──
            elif camp_type == 'SFS_FOLLOWERS' and camp.get('followers_target'):
                followers_target = camp['followers_target']
                # Sumar los followers actuales de ambos canales
                total_new_followers = 0
                for post in posts:
                    ch_res = db.service_client.table('channels').select('followers').eq('id', post['channel_id']).execute()
                    if ch_res.data:
                        total_new_followers += (ch_res.data[0].get('followers') or 0)
                # Comparar con baseline (usamos follower_snapshot almacenado en campaign extras)
                baseline = camp.get('followers_baseline') or 0
                gained = max(0, total_new_followers - baseline)
                logger.info(f"[monitor] Campaña {camp_id} SFS_FOLLOWERS: {gained}/{followers_target} nuevos subs")
                if gained >= followers_target:
                    await _complete_campaign(
                        camp_id, camp['requester_id'], camp['target_id'],
                        f"Tu campaña alcanzó los <b>{followers_target:,} nuevos suscriptores</b> acordados."
                    )

    except Exception as e:
        logger.error(f"Error en monitor_sfs_views_and_fraud: {e}")


def init_scheduler(bot):
    scheduler = AsyncIOScheduler(timezone="UTC")
    
    # Revisión de métricas de canales cada 6 horas
    scheduler.add_job(evaluate_channels_quality, 'interval', hours=6, args=[bot])
    scheduler.add_job(publish_sfs_campaigns, 'interval', minutes=1, args=[bot])
    scheduler.add_job(monitor_sfs_views_and_fraud, 'interval', minutes=5, args=[bot])
    scheduler.add_job(cleanup_expired_stories, 'interval', minutes=15, args=[bot])
    
    scheduler.start()
    logger.info("APScheduler for Promo Bot started")
