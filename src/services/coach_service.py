"""
Nebula Coach - Servicio de Consejero IA para Modelos
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
        raise ValueError("OPENROUTER_API_KEY no esta configurado en .env")
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

# Constantes
# Cambiado a Mistral Large para mejor manejo de contenido adulto/sugerente sin bloqueos
COACH_MODEL_PRINCIPAL = "mistralai/mistral-large" 
COACH_MODEL_FALLBACK = "google/gemini-2.5-flash"
COACH_TEMP = 0.75
COACH_MAX_TOKENS = 3500
REGENERATION_COOLDOWN_DAYS = 0 # Temporalmente 0 para facilitar pruebas

# Efemerides y Fechas Especiales (Knowledge Base para el Coach)
FECHAS_ESPECIALES = [
    {"mes": 1, "dia": 1, "evento": "Anio Nuevo", "estrategia": "Contenido de nuevos comienzos y deseos."},
    {"mes": 2, "dia": 14, "evento": "San Valentin", "estrategia": "Maximo foco en ventas de contenido romantico/sugerente y packs de pareja."},
    {"mes": 3, "dia": 8, "evento": "Dia de la Mujer", "estrategia": "Empoderamiento y contenido especial dedicado a las seguidoras o mensajes de fuerza."},
    {"mes": 7, "dia": 4, "evento": "Verano / Holidays", "estrategia": "Contenido exterior, sol, playa y frescura."},
    {"mes": 10, "dia": 31, "evento": "Halloween", "estrategia": "Disfraces, contenido tematico 'oscuro' y juegos de rol."},
    {"mes": 11, "dia": 25, "evento": "Black Friday", "estrategia": "Ofertas agresivas en suscripciones o contenido premium."},
    {"mes": 12, "dia": 24, "evento": "Nochebuena/Navidad", "estrategia": "Regalos especiales, tematica navideña y agradecimiento."},
]

# ================================================================
# 1. RECOLECCION DE DATOS DE LA MODELO
# ================================================================

def _recolectar_datos_modelo(db, model_id: str) -> dict:
    """Recolecta todas las metricas relevantes de la modelo para el analisis."""
    datos = {
        "model_id": model_id,
        "antiguedad_dias": 0,
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
        "campanias_sfs_mes": 0,
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
        
        if res and res.data:
            created = datetime.fromisoformat(res.data["created_at"].replace("Z", "+00:00"))
            datos["antiguedad_dias"] = (now.replace(tzinfo=created.tzinfo) - created).days
            datos["estado"] = res.data.get("status", "activa")
            datos["creditos"] = res.data.get("credits_balance", 0) or 0
            datos["nombre_artistico"] = res.data.get("artistic_name", "Modelo")
    except Exception as e:
        logger.error(f"[Coach] Error obteniendo perfil modelo: {e}")

    try:
        # Visitas al perfil
        vt = db.client.table("profile_views").select("id", count="exact").eq("model_id", model_id).execute()
        if vt:
            datos["visitas_total"] = vt.count or 0

        vm = db.client.table("profile_views").select("id", count="exact").eq(
            "model_id", model_id).gte("viewed_at", hace_un_mes).execute()
        if vm:
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
        if ventas_res and ventas_res.data:
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
        if posts_res and posts_res.data:
            datos["posts_total"] = len(posts_res.data)
            datos["posts_ultimo_mes"] = sum(1 for p in posts_res.data if p["created_at"] >= hace_un_mes)
            likes = [p.get("likes_count", 0) or 0 for p in posts_res.data]
            datos["likes_promedio"] = round(sum(likes) / len(likes), 1) if likes else 0.0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo posts: {e}")

    try:
        # Reviews y reputacion
        reviews_res = db.client.table("client_reviews").select("rating").eq(
            "model_id", model_id).execute()
        if reviews_res and reviews_res.data:
            ratings = [r["rating"] for r in reviews_res.data if r.get("rating")]
            datos["total_reviews"] = len(ratings)
            datos["calificacion_reviews"] = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo reviews: {e}")

    try:
        # Actividad SFS
        sfs_res = db.client.table("channels").select("id, followers").eq(
            "sfs_user_id", model_id).execute()
        if sfs_res and sfs_res.data:
            datos["canales_sfs"] = len(sfs_res.data)
            datos["seguidores_telegram"] = sum(c.get("followers", 0) or 0 for c in sfs_res.data)

        # Campanias SFS del ultimo mes
        camp_res = db.client.table("promo_campaigns").select("id", count="exact").eq(
            "status", "completed").gte("created_at", hace_un_mes).execute()
        if camp_res:
            datos["campanias_sfs_mes"] = camp_res.count or 0
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo datos SFS: {e}")

    try:
        # Wallet balance
        wallet_res = db.client.table("wallets").select("balance").eq(
            "user_id", model_id).maybe_single().execute()
        if wallet_res and wallet_res.data:
            datos["balance_wallet"] = float(wallet_res.data.get("balance", 0) or 0)
    except Exception as e:
        logger.warning(f"[Coach] Error obteniendo wallet: {e}")

    return datos


# ================================================================
# 2. POOL COLECTIVO DE INSIGHTS
# ================================================================

def _obtener_insights_colectivos(db) -> list[dict]:
    """Obtiene las estadisticas anonimas del pool colectivo de feedback."""
    try:
        res = db.client.table("coach_collective_insights").select("*").execute()
        if res:
            return res.data or []
    except Exception as e:
        logger.warning(f"[Coach] No se pudo obtener insights colectivos: {e}")
    return []


# ================================================================
# 3. CALCULO DEL SCORE Y NIVEL
# ================================================================

def _calcular_score(datos: dict) -> dict:
    """Calcula el score general (0-100) y nivel de la modelo."""
    score = 0

    # Visitas (20 pts max): buen umbral = 200 visitas/mes
    visitas_score = min(datos["visitas_ultimo_mes"] / 200 * 20, 20)
    score += visitas_score

    # Tasa de conversion (30 pts max): 5% = perfecto
    conv_score = min(datos["tasa_conversion"] / 5 * 30, 30)
    score += conv_score

    # Frecuencia de posts (15 pts max): 20 posts/mes = perfecto
    posts_score = min(datos["posts_ultimo_mes"] / 20 * 15, 15)
    score += posts_score

    # Actividad SFS (20 pts max): 4 campanias/mes = perfecto
    sfs_score = min(datos["campanias_sfs_mes"] / 4 * 20, 20)
    score += sfs_score

    # Reputacion (15 pts max): 5 estrellas promedio con 10+ reviews
    if datos["total_reviews"] > 0:
        rep_score = (datos["calificacion_reviews"] / 5) * min(datos["total_reviews"] / 10, 1) * 15
        score += rep_score

    score = round(min(score, 100))

    # Determinar nivel (ASCII puro)
    if score <= 25:
        nivel = "NEW FACE"
    elif score <= 45:
        nivel = "RISING STAR"
    elif score <= 65:
        nivel = "EN DESARROLLO"
    elif score <= 80:
        nivel = "HOT CREATOR"
    else:
        nivel = "SUPER STAR"

    return {"score": score, "nivel": nivel}


# ================================================================
# 4. CONSTRUCCION DEL PROMPT
# ================================================================

def _construir_prompt(datos: dict, score_info: dict, insights: list[dict], mes: int, anio: int) -> str:
    """Construye el prompt contextual para la IA."""
    ahora = datetime.utcnow()
    fecha_actual_str = ahora.strftime("%d de %B de %Y")
    
    # Identificar eventos proximos
    eventos_proximos = []
    for efem in FECHAS_ESPECIALES:
        if efem["mes"] == mes:
            eventos_proximos.append(f"{efem['evento']} ({efem['dia']}/{efem['mes']}): {efem['estrategia']}")

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
            f"- '{i['action_key']}': tasa de exito del {i.get('tasa_exito', 0)}% en {i.get('total_respuestas', 0)} modelos"
            for i in top_exitosas if i.get("tasa_exito") is not None
        ])

    prompt = f"""Eres Nebula Coach, el consejero estrategico y Director Creativo Visual de Nebula.Agency.
Eres un experto en: marketing de contenido adulto sugerente, psicologia del consumidor, estetica visual y growth hacking.

## TU NUEVA PERSONALIDAD:
- Eres un DIRECTOR CREATIVO. No solo das marketing, das ASESORIA VISUAL (iluminacion, encuadre, narrativa).
- Eres un ESTRATEGA TEMPORAL. Sabes que dia es hoy y que festividades vienen para maximizar ventas.
- El contenido que asesoras es CONTENIDO ADULTO SUGERENTE (boudoir, lenceria, artistic nude). Tu lenguaje es profesional, tentador y enfocado en exclusividad.

## CONTEXTO TEMPORAL:
- Fecha de hoy: {fecha_actual_str}
- Eventos especiales para {nombre_mes}:
{chr(10).join(eventos_proximos) if eventos_proximos else "No hay eventos mayores este mes, enfocate en contenido evergreen de alta calidad."}

## TU FILOSOFIA:
- NEBULA.AGENCY es el HUB CENTRAL de monetizacion.
- Tu prioridad es que la modelo use las herramientas de Nebula: Feed Social, Historias y Escrow.

Tu mision: analizar la situacion real de la modelo y generar un plan mensual PRACTICO, EJECUTABLE y PERSONALIZADO para {nombre_mes} {anio}.

## DATOS REALES DE LA MODELO:
- Nombre artistico: {datos.get('nombre_artistico', 'Modelo')}
- Antiguedad: {datos.get('antiguedad_dias', 0)} dias
- Score: {score_info['score']}/100 - Nivel: {score_info['nivel']}

### METRICAS CLAVE:
- Visitas mensuales: {datos['visitas_ultimo_mes']}
- Ventas mensuales: {datos['ventas_ultimo_mes']} (${datos['ingresos_ultimo_mes']:.2f})
- Conversion: {datos['tasa_conversion']}%
- Calificacion: {datos['calificacion_reviews']}/5
- Creditos IA (Bot): {datos['creditos']}

## INTELIGENCIA COLECTIVA:
{insights_texto if insights_texto else "Aun no hay suficientes datos colectivos."}

## INSTRUCCIONES DE GENERACION:
1. IDENTIFICA EL CUELLO DE BOTELLA.
2. CONSEJOS VISUALES EXPERTOS: En cada semana, incluye al menos una accion de MEJORA VISUAL (ej: 'Iluminacion lateral para resaltar curvas', 'Narrativa de lenceria roja para San Valentin').
3. APROVECHA LA TEMPORALIDAD: Si hay eventos proximos, el plan DEBE girar en torno a ellos.
4. INCITA AL USO DE NEBULA: Sugiere publicar en Feed e Historias.
5. Los planes para contenido adulto deben ser sugerentes y profesionales, enfocados en el deseo del cliente y exclusividad.

## FORMATO DE RESPUESTA (JSON ESTRICTO):
{{
  "diagnostico": {{
    "nivel": "{score_info['nivel']}",
    "score_general": {score_info['score']},
    "fortalezas": ["..."],
    "areas_criticas": ["..."],
    "resumen": "..."
  }},
  "meta_del_mes": "...",
  "semanas": [
    {{
      "numero": 1,
      "foco": "...",
      "acciones": [
        {{
          "key": "...",
          "categoria": "crecimiento|ventas|contenido|reputacion|monetizacion",
          "titulo": "...",
          "descripcion": "DEBE incluir detalles de CÓMO producir el contenido visualmente.",
          "impacto": "alto|medio|bajo",
          "tiempo_estimado": "...",
          "dato_colectivo": "..."
        }}
      ]
    }}
  ],
  "mensaje_motivacional": "..."
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
                    {"role": "system", "content": "Eres Nebula Coach. SIEMPRE responde con JSON puro valido. Eres experto en marketing adulto sugerente."},
                    {"role": "user", "content": prompt}
                ],
                extra_headers={
                    "HTTP-Referer": "https://nebula.agency",
                    "X-Title": "Nebula Coach"
                }
            )
            contenido = resp.choices[0].message.content.strip()

            # Limpiar markdown
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
            import traceback
            logger.error(f"[Coach] Error llamando a {modelo}: {e}")
            continue

    raise RuntimeError("No se pudo generar el plan. Ambos modelos de IA fallaron.")


# ================================================================
# 6. FUNCION PRINCIPAL: GENERAR PLAN
# ================================================================

def generar_plan_mensual(db, model_id: str, mes: int, anio: int, forzar: bool = False) -> dict:
    """Genera (o recupera cached) el plan mensual de la modelo."""
    existing_data = None
    existing_id = None

    try:
        existing_res = db.client.table("coach_plans").select("*").eq("model_id", model_id).eq(
            "month", mes).eq("year", anio).maybe_single().execute()

        if existing_res and existing_res.data:
            existing_data = existing_res.data
            existing_id = existing_res.data.get("id")
    except Exception as e:
        logger.error(f"[Coach] Error consultando coach_plans: {e}")
        raise RuntimeError(f"Error de base de datos consultando coach_plans: {str(e)}")

    if existing_data and not forzar:
        return {
            "plan": existing_data["plan_data"],
            "generado_en": existing_data["generated_at"],
            "regeneraciones": existing_data.get("regenerated_count", 0),
            "desde_cache": True
        }

    if existing_data and forzar:
        last_regen = existing_data.get("last_regenerated_at")
        if last_regen:
            try:
                last_dt = datetime.fromisoformat(last_regen.replace("Z", "+00:00"))
                ahora = datetime.utcnow().replace(tzinfo=last_dt.tzinfo)
                if (ahora - last_dt).days < REGENERATION_COOLDOWN_DAYS:
                    dias_restantes = REGENERATION_COOLDOWN_DAYS - (ahora - last_dt).days
                    raise ValueError(f"Puedes regenerar el plan en {dias_restantes} dia(s).")
            except ValueError:
                raise
            except Exception:
                pass

    logger.info(f"[Coach] Recolectando datos para modelo {model_id}...")
    datos = _recolectar_datos_modelo(db, model_id)
    insights = _obtener_insights_colectivos(db)
    score_info = _calcular_score(datos)

    prompt = _construir_prompt(datos, score_info, insights, mes, anio)
    plan = _llamar_ia_y_parsear(prompt)

    ahora_iso = datetime.utcnow().isoformat()
    try:
        if existing_data and existing_id:
            db.client.table("coach_plans").update({
                "plan_data": plan,
                "last_regenerated_at": ahora_iso,
                "regenerated_count": existing_data.get("regenerated_count", 0) + 1
            }).eq("id", existing_id).execute()
            regeneraciones = existing_data.get("regenerated_count", 0) + 1
        else:
            db.client.table("coach_plans").insert({
                "model_id": model_id,
                "month": mes,
                "year": anio,
                "plan_data": plan,
                "generated_at": ahora_iso,
                "regenerated_count": 0
            }).execute()
            regeneraciones = 0
    except Exception as e:
        logger.error(f"[Coach] Error guardando plan: {e}")
        regeneraciones = 0

    return {
        "plan": plan,
        "generado_en": ahora_iso,
        "regeneraciones": regeneraciones,
        "desde_cache": False,
        "score": score_info["score"],
        "nivel": score_info["nivel"]
    }

def registrar_feedback(db, model_id: str, plan_id: str, action_key: str,
                       action_category: str, result: str, notes: str = None) -> dict:
    """Registra el resultado de una accion del plan."""
    try:
        ahora = datetime.utcnow().isoformat()
        existing = db.client.table("coach_feedback").select("id").eq(
            "plan_id", plan_id).eq("action_key", action_key).maybe_single().execute()

        if existing and existing.data:
            db.client.table("coach_feedback").update({
                "result": result,
                "notes": notes,
                "updated_at": ahora
            }).eq("id", existing.data["id"]).execute()
        else:
            db.client.table("coach_feedback").insert({
                "model_id": model_id, "plan_id": plan_id, "action_key": action_key,
                "action_category": action_category, "result": result, "notes": notes,
                "created_at": ahora, "updated_at": ahora
            }).execute()
        return {"status": "ok", "action_key": action_key}
    except Exception as e:
        logger.error(f"[Coach] Error registrando feedback: {e}")
        raise

def obtener_insights_publicos(db) -> list[dict]:
    """Retorna insights colectivos formateados."""
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
