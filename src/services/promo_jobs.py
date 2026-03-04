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
        campaigns_res = db.client.table('promo_campaigns').select(
            '*, requester_template:promo_templates!requester_template_id(*), target_template:promo_templates!target_template_id(*)'
        ).eq('status', 'accepted').lte('start_time', now_iso).execute()

        for camp in campaigns_res.data:
            # 1. Obtener los canales vinculados a requester y target
            req_channels = db.client.table('channels').select('*').eq('sfs_user_id', camp['requester_id']).eq('status', 'active').execute()
            tgt_channels = db.client.table('channels').select('*').eq('sfs_user_id', camp['target_id']).eq('status', 'active').execute()
            
            if not req_channels.data or not tgt_channels.data:
                logger.warning(f"Campaña {camp['id']} fallida: Uno de los usuarios no tiene canal activo.")
                continue

            req_channel = req_channels.data[0]
            tgt_channel = tgt_channels.data[0]
            
            req_template = camp['requester_template']
            tgt_template = camp['target_template']
            
            # Enviar el template del TARGET al canal del REQUESTER
            try:
                # copy_message(chat_id_destino, chat_id_origen, message_id_origen)
                # El "chat_id_origen" es el bot en chat privado con el target. 
                # Pero como template guarda el origin message ID, usamos eso
                bot_chat_id = tgt_template['telegram_message_id_origin'] # Asumiendo que guardamos el mensaje en el chat con el bot
                
                # NOTA PARA DESARROLLO: copy_message requiere el ID del chat de origen (el chat privado del target con el bot)
                # Simplificaremos enviando el contenido crudo si fallara el copy_message. Aquí usamos un try genérico.
                msg1 = await bot.copy_message(
                    chat_id=req_channel['telegram_chat_id'],
                    from_chat_id=tgt_template['content_data'].get('chat_id', tgt_template['model_id']), # Workaround
                    message_id=tgt_template['telegram_message_id_origin']
                )
                
                # Enviar el template del REQUESTER al canal del TARGET
                msg2 = await bot.copy_message(
                    chat_id=tgt_channel['telegram_chat_id'],
                    from_chat_id=req_template['content_data'].get('chat_id', req_template['model_id']),
                    message_id=req_template['telegram_message_id_origin']
                )
                
                # Guardar los IDs publicados
                db.client.table('promo_posts').insert([
                    {'campaign_id': camp['id'], 'channel_id': req_channel['id'], 'telegram_message_id': msg1.message_id},
                    {'campaign_id': camp['id'], 'channel_id': tgt_channel['id'], 'telegram_message_id': msg2.message_id}
                ]).execute()
                
                # Marcar campaña como activa
                db.client.table('promo_campaigns').update({'status': 'active'}).eq('id', camp['id']).execute()
                logger.info(f"Campaña {camp['id']} activada con éxito.")
                
            except Exception as e:
                logger.error(f"Error publicando cruzado para campaña {camp['id']}: {e}")
                
    except Exception as e:
        logger.error(f"Error en publish_sfs_campaigns: {e}")

async def monitor_sfs_views_and_fraud(bot):
    """
    Job para monitorear fraude (Borrado prematuro) y finalizar campañas completadas.
    """
    logger.info("Executing Job: Monitor SFS metrics & Fraud")
    try:
        # Buscar campañas activas
        active_camps = db.client.table('promo_campaigns').select('*, promo_posts(*)').eq('status', 'active').execute()
        now = datetime.utcnow()
        
        for camp in active_camps.data:
            posts = camp.get('promo_posts', [])
            fraud_detected = False
            
            # Verificar si los mensajes siguen existiendo
            for post in posts:
                # Obtener info del canal
                channel_data = db.client.table('channels').select('telegram_chat_id').eq('id', post['channel_id']).execute()
                if not channel_data.data:
                    continue
                chat_id = channel_data.data[0]['telegram_chat_id']
                
                try:
                    # Intentar reenviar el mensaje a sí mismo (al chat del canal silenciosamente) o usar edit para ver si existe
                    # La forma más segura de detectar borrado en Telegram API es intentando copiarlo o fallando
                    pass
                    # (Placeholder lógico: Si falla con "Message not found", fraud_detected = True)
                except Exception as e:
                    if "not found" in str(e).lower():
                        fraud_detected = True
                        logger.warning(f"¡Fraude Detectado en campaña {camp['id']}! Mensaje {post['telegram_message_id']} borrado.")
                        break

            if fraud_detected:
                # Castigo de fraude
                db.client.table('promo_campaigns').update({'status': 'cancelled_fraud'}).eq('id', camp['id']).execute()
                # Quitar 50 puntos de Trust Score a los involucrados (simplificado, habría que detectar quién borró)
                # db.client.rpc('penalize_trust_score', {'p_model_id': ...})
                continue

            # Verificar si se cumplió el tiempo
            if camp['type'] == 'SFS_TIME' and camp['duration_hours']:
                start = datetime.fromisoformat(camp['start_time'].replace("Z", "+00:00"))
                diff_hours = (now - start.replace(tzinfo=None)).total_seconds() / 3600
                
                if diff_hours >= camp['duration_hours']:
                    # Eliminar mensajes
                    for post in posts:
                        channel_data = db.client.table('channels').select('telegram_chat_id').eq('id', post['channel_id']).execute()
                        chat_id = channel_data.data[0]['telegram_chat_id']
                        try:
                            await bot.delete_message(chat_id=chat_id, message_id=post['telegram_message_id'])
                        except Exception as e:
                            logger.error(f"No se pudo eliminar mensaje finalizado: {e}")
                            
                    # Marcar campaña completada e incrementar trust_score
                    db.client.table('promo_campaigns').update({'status': 'completed'}).eq('id', camp['id']).execute()
                    logger.info(f"Campaña SFS {camp['id']} completada exitosamente.")

    except Exception as e:
        logger.error(f"Error en monitor_sfs_vies_and_fraud: {e}")

def init_scheduler(bot):
    scheduler = AsyncIOScheduler(timezone="UTC")
    
    # Revisión de métricas de canales cada 6 horas
    scheduler.add_job(evaluate_channels_quality, 'interval', hours=6, args=[bot])
    scheduler.add_job(publish_sfs_campaigns, 'interval', minutes=1, args=[bot])
    scheduler.add_job(monitor_sfs_views_and_fraud, 'interval', minutes=5, args=[bot])
    scheduler.add_job(cleanup_expired_stories, 'interval', minutes=15, args=[bot])
    
    scheduler.start()
    logger.info("APScheduler for Promo Bot started")
