"""
Nebula Coach — Servicio de Consejero IA para Modelos
=====================================================
Recolecta datos reales de la modelo, consulta el pool colectivo de insights,
construye un prompt contextual y llama a la IA para generar un plan mensual.
"""
import os
import json
import logging
from datetime import datetime, timedelta
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# --- Cliente OpenRouter ---
def _get_openrouter_client():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY no está configurado en .env")
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

# Constantes
COACH_MODEL_PRINCIPAL = "google/gemini-flash-1.5"
COACH_MODEL_FALLBACK = "meta-llama/llama-3.3-70b-instruct"
COACH_TEMP = 0.72
COACH_MAX_TOKENS = 3000
REGENERATION_COOLDOWN_DAYS = 7  # Días mínimos entre regeneraciones manuales


# ================================================================
# 1. RECOLECCIÓN DE DATOS DE LA MODELO
# ================================================================

def _recolectar_datos_modelo(db, model_id: str) -> dict:
    """Recolecta todas las métricas relevantes de la modelo para el análisis."""
    datos = {
        "model_id": model_id,
        "antigüedad_dias": 0,
        "estado": "activa",
        "creditos": 0,
        "visitas_total": 0,
        "visitas_ultimo_mes": 0,
        "ventas_total": 0,
        "ingresos_total": 0.0,
        "ventas_ultimo_mes": 0,
        "ingresos_ultimo_mes": 0.0,
        "tasa_conversion": 0.0,
        "posts_total": 0,
        "posts_ultimo_mes": 0,
        "likes_promedio": 0.0,
        "calificacion_reviews": 0.0,
        "total_reviews": 0,
        "canales_sfs": 0,
        "seguidores_telegram": 0,
        "campañas_sfs_mes": 0,
        "balance_wallet": 0.0,
        "tiene_bot_activo": False,
    }

    now = datetime.utcnow()
    hace_un_mes = (now - timedelta(days=30)).isoformat()

    try:
        # Perfil base de la modelo
        res = db.client.table("models").select(
            "id, status, credits_balance, created_at, artistic_name"
        ).eq("id", model_id).maybe_single().execute()
        if res.data:
            created = datetime.fromisoformat(res.data["created_at"].replace("Z", "+00:00"))
            datos["antigüedad_dias"] = (now.replace(tzinfo=created.tzinfo) - created).days
            datos["estado"] = res.data.get("status", "activa")
            datos["creditos"] = res.data.get("credits_balance", 0) or 0
            datos["nombre_artistico"] = res.data.get("artistic_name", "Modelo")
    except Exception as e:
        logger.error(f"[Coach] Error obteniendo perfil modelo: {e}")

    try:
        # Visitas al perfil
        vt = db.client.table("profile_views").select("id", count="exact").eq("model_id", model_id).execute()
        datos["visitas_total"] = vt.count or 0

        vm = db.client.table("profile_views").select("id", count="exact").eq(
            "model_id", model_id).gte("viewed_at", hace_un_mes).execute()
        datos["visitas_ultimo_mes"] = vm.count or 0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo visitas: {e}")

    try:
        # Ventas e ingresos (escrow completados)
        def safe_float(v):
            try:
                return float(v) if v else 0.0
            except:
                return 0.0

        ventas_res = db.client.table("escrow_orders").select("amount, created_at").eq(
            "model_id", model_id).eq("status", "RELEASED").execute()
        if ventas_res.data:
            datos["ventas_total"] = len(ventas_res.data)
            datos["ingresos_total"] = sum(safe_float(o["amount"]) for o in ventas_res.data)
            ventas_mes = [o for o in ventas_res.data if o["created_at"] >= hace_un_mes]
            datos["ventas_ultimo_mes"] = len(ventas_mes)
            datos["ingresos_ultimo_mes"] = sum(safe_float(o["amount"]) for o in ventas_mes)

        if datos["visitas_ultimo_mes"] > 0:
            datos["tasa_conversion"] = round(
                datos["ventas_ultimo_mes"] / datos["visitas_ultimo_mes"] * 100, 2
            )
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo ventas: {e}")

    try:
        # Posts y engagement
        posts_res = db.client.table("posts").select("id, likes_count, created_at").eq(
            "model_id", model_id).execute()
        if posts_res.data:
            datos["posts_total"] = len(posts_res.data)
            datos["posts_ultimo_mes"] = sum(1 for p in posts_res.data if p["created_at"] >= hace_un_mes)
            likes = [p.get("likes_count", 0) or 0 for p in posts_res.data]
            datos["likes_promedio"] = round(sum(likes) / len(likes), 1) if likes else 0.0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo posts: {e}")

    try:
        # Reviews y reputación
        reviews_res = db.client.table("client_reviews").select("rating").eq(
            "model_id", model_id).execute()
        if reviews_res.data:
            ratings = [r["rating"] for r in reviews_res.data if r.get("rating")]
            datos["total_reviews"] = len(ratings)
            datos["calificacion_reviews"] = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo reviews: {e}")

    try:
        # Actividad SFS
        sfs_res = db.client.table("channels").select("id, followers").eq(
            "sfs_user_id", model_id).execute()
        if sfs_res.data:
            datos["canales_sfs"] = len(sfs_res.data)
            datos["seguidores_telegram"] = sum(c.get("followers", 0) or 0 for c in sfs_res.data)

        # Campañas SFS del último mes
        camp_res = db.client.table("promo_campaigns").select("id", count="exact").eq(
            "status", "completed").gte("created_at", hace_un_mes).execute()
        datos["campañas_sfs_mes"] = camp_res.count or 0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo datos SFS: {e}")

    try:
        # Wallet balance
        wallet_res = db.client.table("wallets").select("balance").eq(
            "user_id", model_id).maybe_single().execute()
        if wallet_res.data:
            datos["balance_wallet"] = float(wallet_res.data.get("balance", 0) or 0)
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo wallet: {e}")

    return datos


# ================================================================
# 2. POOL COLECTIVO DE INSIGHTS
# ================================================================

def _obtener_insights_colectivos(db) -> list[dict]:
    """Obtiene las estadísticas anónimas del pool colectivo de feedback."""
    try:
        res = db.client.table("coach_collective_insights").select("*").execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"[Coach] No se pudo obtener insights colectivos: {e}")
        return []


# ================================================================
# 3. CÁLCULO DEL SCORE Y NIVEL
# ================================================================

def _calcular_score(datos: dict) -> dict:
    """Calcula el score general (0-100) y nivel de la modelo."""
    score = 0

    # Visitas (20 pts máx): buen umbral = 200 visitas/mes
    visitas_score = min(datos["visitas_ultimo_mes"] / 200 * 20, 20)
    score += visitas_score

    # Tasa de conversión (30 pts máx): 5% = perfecto
    conv_score = min(datos["tasa_conversion"] / 5 * 30, 30)
    score += conv_score

    # Frecuencia de posts (15 pts máx): 20 posts/mes = perfecto
    posts_score = min(datos["posts_ultimo_mes"] / 20 * 15, 15)
    score += posts_score

    # Actividad SFS (20 pts máx): 4 campañas/mes = perfecto
    sfs_score = min(datos["campañas_sfs_mes"] / 4 * 20, 20)
    score += sfs_score

    # Reputación (15 pts máx): 5 estrellas promedio con 10+ reviews
    if datos["total_reviews"] > 0:
        rep_score = (datos["calificacion_reviews"] / 5) * min(datos["total_reviews"] / 10, 1) * 15
        score += rep_score

    score = round(min(score, 100))

    # Determinar nivel
    if score <= 25:
        nivel = "🌱 New Face"
    elif score <= 45:
        nivel = "⭐ Rising Star"
    elif score <= 65:
        nivel = "💫 En Desarrollo"
    elif score <= 80:
        nivel = "🔥 Hot Creator"
    else:
        nivel = "👑 Super Star"

    return {"score": score, "nivel": nivel}


# ================================================================
# 4. CONSTRUCCIÓN DEL PROMPT
# ================================================================

def _construir_prompt(datos: dict, score_info: dict, insights: list[dict], mes: int, año: int) -> str:
    """Construye el prompt contextual para la IA."""
    meses_es = {
        1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
        5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
        9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
    }
    nombre_mes = meses_es.get(mes, str(mes))

    # Formatear insights colectivos
    insights_texto = ""
    if insights:
        top_exitosas = sorted(insights, key=lambda x: x.get("tasa_exito", 0) or 0, reverse=True)[:5]
        insights_texto = "\n".join([
            f"- '{i['action_key']}': tasa de éxito del {i.get('tasa_exito', 0)}% en {i.get('total_respuestas', 0)} modelos"
            for i in top_exitosas if i.get("tasa_exito") is not None
        ])

    prompt = f"""Eres Nebula Coach, el consejero estratégico de élite de la plataforma Nebula.Agency.
Eres un experto combinado en: ventas de contenido digital, marketing en Telegram, psicología social del consumidor, growth hacking y monetización de creadores de contenido.

Tu misión: analizar la situación real de la modelo y generar un plan mensual PRÁCTICO, EJECUTABLE y PERSONALIZADO para {nombre_mes} {año}.

## DATOS REALES DE LA MODELO:
- Nombre artístico: {datos.get('nombre_artistico', 'Modelo')}
- Antigüedad en plataforma: {datos.get('antigüedad_dias', 0)} días
- Score actual: {score_info['score']}/100 — Nivel: {score_info['nivel']}

### EXPOSICIÓN Y TRÁFICO:
- Visitas totales al perfil: {datos['visitas_total']}
- Visitas este último mes: {datos['visitas_ultimo_mes']}
- Seguidores en Telegram: {datos['seguidores_telegram']}
- Canales vinculados al sistema SFS: {datos['canales_sfs']}

### VENTAS Y CONVERSIÓN:
- Ventas totales históricas: {datos['ventas_total']}
- Ventas último mes: {datos['ventas_ultimo_mes']}
- Ingresos último mes: ${datos['ingresos_ultimo_mes']:.2f}
- Tasa de conversión: {datos['tasa_conversion']}% (visitas → ventas)

### CONTENIDO:
- Posts publicados en último mes: {datos['posts_ultimo_mes']}
- Total posts históricos: {datos['posts_total']}
- Likes promedio por post: {datos['likes_promedio']}

### REPUTACIÓN:
- Calificación promedio de reviews: {datos['calificacion_reviews']}/5 ({datos['total_reviews']} reviews)

### ACTIVIDAD SFS ÚLTIMO MES:
- Campañas SFS participadas: {datos['campañas_sfs_mes']}

### ECONOMÍA:
- Créditos disponibles: {datos['creditos']}
- Balance en wallet: ${datos['balance_wallet']:.2f}

## INTELIGENCIA COLECTIVA (acciones exitosas en el ecosistema Nebula):
{insights_texto if insights_texto else "Aún no hay suficientes datos colectivos. Usa tu criterio experto."}

## INSTRUCCIONES DE GENERACIÓN:
1. Analiza los datos y encuentra los CUELLOS DE BOTELLA más críticos.
2. Genera un plan para 4 semanas del mes, con FOCO DIFERENTE cada semana (no repitas las mismas acciones).
3. Cada semana debe tener 3-5 acciones concretas y ejecutables.
4. Usa las acciones del pool colectivo cuando sean relevantes, mencionando la estadística.
5. Sé directo, motivador pero realista. No uses lenguaje corporativo.
6. El plan debe estar en español, tono moderno y cercano.

## FORMATO DE RESPUESTA (JSON ESTRICTO, sin markdown, sin texto antes ni después):
{{
  "diagnostico": {{
    "nivel": "{score_info['nivel']}",
    "score_general": {score_info['score']},
    "fortalezas": ["lista de 2-3 puntos fuertes reales basados en los datos"],
    "areas_criticas": ["lista de 2-3 puntos débiles críticos con datos específicos"],
    "resumen": "Párrafo corto y directo analizando la situación real en 2-3 oraciones"
  }},
  "meta_del_mes": "Meta principal y específica para este mes (con número medible)",
  "semanas": [
    {{
      "numero": 1,
      "foco": "Nombre del foco estratégico de esta semana",
      "acciones": [
        {{
          "key": "identificador_snake_case_unico",
          "categoria": "crecimiento|ventas|contenido|reputacion|monetizacion",
          "titulo": "Título corto (máx 8 palabras)",
          "descripcion": "Descripción práctica de QUÉ hacer y CÓMO (2-3 oraciones)",
          "impacto": "alto|medio|bajo",
          "tiempo_estimado": "Ej: 20 min/día",
          "dato_colectivo": "Dato del pool o insight experto relevante (o null si no hay dato)"
        }}
      ]
    }}
  ],
  "mensaje_motivacional": "Mensaje personalizado, genuino y alentador. Máx 2 oraciones."
}}"""
    return prompt


# ================================================================
# 5. LLAMADA A LA IA Y PARSEO
# ================================================================

def _llamar_ia_y_parsear(prompt: str) -> dict:
    """Llama a OpenRouter y parsea el JSON del plan."""
    client = _get_openrouter_client()

    for modelo in [COACH_MODEL_PRINCIPAL, COACH_MODEL_FALLBACK]:
        try:
            logger.info(f"[Coach] Llamando a IA con modelo: {modelo}")
            resp = client.chat.completions.create(
                model=modelo,
                temperature=COACH_TEMP,
                max_tokens=COACH_MAX_TOKENS,
                messages=[
                    {"role": "system", "content": "Eres Nebula Coach. SIEMPRE responde con JSON puro válido, sin markdown ni texto extra."},
                    {"role": "user", "content": prompt}
                ],
                extra_headers={
                    "HTTP-Referer": "https://nebula.agency",
                    "X-Title": "Nebula Coach"
                }
            )
            contenido = resp.choices[0].message.content.strip()

            # Limpiar posible markdown
            if contenido.startswith("```"):
                contenido = contenido.split("```")[1]
                if contenido.startswith("json"):
                    contenido = contenido[4:]
            if contenido.endswith("```"):
                contenido = contenido[:-3]

            plan = json.loads(contenido.strip())
            logger.info(f"[Coach] Plan generado exitosamente con {modelo}")
            return plan
        except json.JSONDecodeError as e:
            logger.error(f"[Coach] Error parseando JSON de {modelo}: {e}")
            continue
        except Exception as e:
            logger.error(f"[Coach] Error llamando a {modelo}: {e}")
            continue

    raise RuntimeError("No se pudo generar el plan. Ambos modelos de IA fallaron.")


# ================================================================
# 6. FUNCIÓN PRINCIPAL: GENERAR PLAN
# ================================================================

def generar_plan_mensual(db, model_id: str, mes: int, año: int, forzar: bool = False) -> dict:
    """
    Genera (o recupera cached) el plan mensual de la modelo.
    
    Args:
        db: Instancia de base de datos Supabase.
        model_id: UUID de la modelo.
        mes: Mes del plan (1-12).
        año: Año del plan.
        forzar: Si True, regenera aunque exista (con validación de cooldown).
    
    Returns:
        dict con el plan completo + metadata.
    """
    # 1. Verificar si ya existe un plan para este mes
    existing_res = db.client.table("coach_plans").select("*").eq("model_id", model_id).eq(
        "month", mes).eq("year", año).maybe_single().execute()

    if existing_res.data and not forzar:
        logger.info(f"[Coach] Retornando plan cacheado para modelo {model_id} ({mes}/{año})")
        return {
            "plan": existing_res.data["plan_data"],
            "generado_en": existing_res.data["generated_at"],
            "regeneraciones": existing_res.data["regenerated_count"],
            "desde_cache": True
        }

    # 2. Validar cooldown de regeneración manual
    if existing_res.data and forzar:
        last_regen = existing_res.data.get("last_regenerated_at")
        if last_regen:
            try:
                last_dt = datetime.fromisoformat(last_regen.replace("Z", "+00:00"))
                ahora = datetime.utcnow().replace(tzinfo=last_dt.tzinfo)
                dias_desde_regen = (ahora - last_dt).days
                if dias_desde_regen < REGENERATION_COOLDOWN_DAYS:
                    dias_restantes = REGENERATION_COOLDOWN_DAYS - dias_desde_regen
                    raise ValueError(
                        f"Puedes regenerar el plan en {dias_restantes} día(s). "
                        f"El cooldown es de {REGENERATION_COOLDOWN_DAYS} días."
                    )
            except ValueError:
                raise
            except Exception:
                pass  # Si no se puede parsear la fecha, permitir regeneración

    # 3. Recolectar datos y generar plan
    logger.info(f"[Coach] Recolectando datos para modelo {model_id}...")
    datos = _recolectar_datos_modelo(db, model_id)
    insights = _obtener_insights_colectivos(db)
    score_info = _calcular_score(datos)

    prompt = _construir_prompt(datos, score_info, insights, mes, año)
    plan = _llamar_ia_y_parsear(prompt)

    # 4. Guardar en DB (upsert)
    ahora_iso = datetime.utcnow().isoformat()
    if existing_res.data:
        # Actualizar plan existente (regeneración)
        db.client.table("coach_plans").update({
            "plan_data": plan,
            "last_regenerated_at": ahora_iso,
            "regenerated_count": existing_res.data["regenerated_count"] + 1
        }).eq("id", existing_res.data["id"]).execute()
        regeneraciones = existing_res.data["regenerated_count"] + 1
    else:
        # Crear nuevo plan
        insert_res = db.client.table("coach_plans").insert({
            "model_id": model_id,
            "month": mes,
            "year": año,
            "plan_data": plan,
            "generated_at": ahora_iso,
            "regenerated_count": 0
        }).execute()
        regeneraciones = 0

    return {
        "plan": plan,
        "generado_en": ahora_iso,
        "regeneraciones": regeneraciones,
        "desde_cache": False,
        "score": score_info["score"],
        "nivel": score_info["nivel"]
    }


# ================================================================
# 7. REGISTRO DE FEEDBACK
# ================================================================

def registrar_feedback(db, model_id: str, plan_id: str, action_key: str,
                       action_category: str, result: str, notes: str = None) -> dict:
    """Registra el resultado de una acción del plan."""
    try:
        ahora = datetime.utcnow().isoformat()

        # Upsert: actualizar si existe, insertar si no
        existing = db.client.table("coach_feedback").select("id").eq(
            "plan_id", plan_id).eq("action_key", action_key).maybe_single().execute()

        if existing.data:
            db.client.table("coach_feedback").update({
                "result": result,
                "notes": notes,
                "updated_at": ahora
            }).eq("id", existing.data["id"]).execute()
            return {"status": "updated", "action_key": action_key}
        else:
            db.client.table("coach_feedback").insert({
                "model_id": model_id,
                "plan_id": plan_id,
                "action_key": action_key,
                "action_category": action_category,
                "result": result,
                "notes": notes,
                "created_at": ahora,
                "updated_at": ahora
            }).execute()
            return {"status": "created", "action_key": action_key}
    except Exception as e:
        logger.error(f"[Coach] Error registrando feedback: {e}")
        raise


# ================================================================
# 8. OBTENER INSIGHTS PARA EL FRONTEND
# ================================================================

def obtener_insights_publicos(db) -> list[dict]:
    """Retorna insights colectivos formateados para mostrar en el frontend."""
    insights = _obtener_insights_colectivos(db)
    return [
        {
            "accion": i["action_key"].replace("_", " ").title(),
            "categoria": i["action_category"],
            "tasa_exito": i.get("tasa_exito"),
            "total": i.get("total_respuestas", 0)
        }
        for i in insights if i.get("tasa_exito") is not None
    ]
