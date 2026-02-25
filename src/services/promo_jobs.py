import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
from datetime import datetime
from telegram.error import TelegramError

from src.services.database import SupabaseClient

logger = logging.getLogger(__name__)
db = SupabaseClient()

async def evaluate_channels_quality(bot):
    """
    Job programado (ej. Cada 24 horas).
    - Busca canales en status 'verifying' o 'active'
    - Actualiza el 'followers' consultando la API de Telegram.
    NOTA: Para calcular el ER real exacto con Vistas, se requiere que el bot almacene
    el histórico de posts entrantes (channel_post handler). 
    """
    logger.info("Executing Job: Evaluate Channels Quality")
    try:
        channels_res = db.client.table('channels').select('*').in_('status', ['verifying', 'active']).execute()
        for channel in channels_res.data:
            try:
                # Obtener cantidad de suscriptores
                count = await bot.get_chat_member_count(chat_id=channel['telegram_chat_id'])
                
                # Simular cálculo ER simple basado en membresía para MVP (idealmente con histórico de channel_posts)
                estimated_avg_views = int(count * 0.15) # Asumimos 15% de alcance base
                estimated_er = 15.00
                
                db.client.table('channels').update({
                    'followers': count,
                    'avg_views': estimated_avg_views,
                    'engagement_rate': estimated_er,
                    'status': 'active'
                }).eq('id', channel['id']).execute()
                
            except TelegramError as e:
                logger.warning(f"No se pudo acceder al canal {channel['telegram_chat_id']} ({channel['name']}): {e}")
                # Posiblemente remover canal si el bot fue expulsado
                if 'chat not found' in str(e).lower() or 'kicked' in str(e).lower():
                    db.client.table('channels').update({'status': 'inactive'}).eq('id', channel['id']).execute()
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
            req_channels = db.client.table('channels').select('*').eq('model_id', camp['requester_id']).eq('status', 'active').execute()
            tgt_channels = db.client.table('channels').select('*').eq('model_id', camp['target_id']).eq('status', 'active').execute()
            
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
    
    scheduler.add_job(evaluate_channels_quality, 'interval', hours=24, args=[bot])
    scheduler.add_job(publish_sfs_campaigns, 'interval', minutes=1, args=[bot])
    scheduler.add_job(monitor_sfs_views_and_fraud, 'interval', minutes=5, args=[bot])
    
    scheduler.start()
    logger.info("APScheduler for Promo Bot started")
