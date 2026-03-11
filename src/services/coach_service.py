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
COACH_MODEL_PRINCIPAL = "google/gemini-2.5-flash" 
COACH_MODEL_FALLBACK = "mistralai/mistral-large"
COACH_TEMP = 0.75
COACH_MAX_TOKENS = 3500
REGENERATION_COOLDOWN_DAYS = 0 # Temporalmente 0 para pruebas del usuario

# Efemerides y Fechas Especiales
FECHAS_ESPECIALES = [
    {"mes": 1, "dia": 1, "evento": "Anio Nuevo", "estrategia": "Contenido de nuevos comienzos y deseos."},
    {"mes": 2, "dia": 14, "evento": "San Valentin", "estrategia": "Maximo foco en ventas de contenido romantico y packs de pareja."},
    {"mes": 3, "dia": 8, "evento": "Dia de la Mujer", "estrategia": "Empoderamiento y contenido especial dedicado a seguidoras."},
    {"mes": 7, "dia": 4, "evento": "Verano / Vacaciones", "estrategia": "Contenido exterior, sol y playa."},
    {"mes": 10, "dia": 31, "evento": "Halloween", "estrategia": "Disfraces y contenido tematico."},
    {"mes": 11, "dia": 25, "evento": "Black Friday", "estrategia": "Ofertas agresivas en suscripciones."},
    {"mes": 12, "dia": 24, "evento": "Navidad", "estrategia": "Regalos especiales y tematica navideña."},
]

# ================================================================
# 1. RECOLECCION DE DATOS DE LA MODELO
# ================================================================

def _recolectar_datos_modelo(db, model_id: str) -> dict:
    """Recolecta metricas detalladas de la modelo."""
    datos = {
        "model_id": model_id,
        "antiguedad_dias": 0,
        "estado": "activa",
        "creditos": 0,
        "visitas_total": 0,
        "visitas_ultimo_mes": 0,
        "ventas_total": 0,
        "ingresos_ultimo_mes": 0.0,
        "tasa_conversion": 0.0,
        "posts_total": 0,
        "posts_ultimo_mes": 0,
        "calificacion_reviews": 0.0,
        "total_reviews": 0,
        "canales_sfs": 0,
        "seguidores_telegram": 0,
        "campanias_sfs_mes": 0,
        "balance_wallet": 0.0,
        "casino_total_apuestas": 0,
        "casino_volumen": 0.0,
    }

    now = datetime.utcnow()
    hace_un_mes = (now - timedelta(days=30)).isoformat()

    try:
        # Perfil base
        res = db.client.table("models").select("*").eq("id", model_id).maybe_single().execute()
        if res and res.data:
            created = datetime.fromisoformat(res.data["created_at"].replace("Z", "+00:00"))
            datos["antiguedad_dias"] = (now.replace(tzinfo=created.tzinfo) - created).days
            datos["creditos"] = res.data.get("credits_balance", 0) or 0
            datos["nombre_artistico"] = res.data.get("artistic_name", "Modelo")
    except Exception as e:
        logger.error(f"[Coach] Error perfil: {e}")

    try:
        # Visitas
        vm = db.client.table("profile_views").select("id", count="exact").eq(
            "model_id", model_id).gte("viewed_at", hace_un_mes).execute()
        datos["visitas_ultimo_mes"] = vm.count or 0
    except: pass

    try:
        # Ventas (Escrow)
        v_res = db.client.table("escrow_orders").select("amount").eq(
            "model_id", model_id).eq("status", "RELEASED").gte("created_at", hace_un_mes).execute()
        if v_res and v_res.data:
            datos["ventas_ultimo_mes"] = len(v_res.data)
            datos["ingresos_ultimo_mes"] = sum(float(o.get("amount", 0) or 0) for o in v_res.data)
            if datos["visitas_ultimo_mes"] > 0:
                datos["tasa_conversion"] = round(len(v_res.data) / datos["visitas_ultimo_mes"] * 100, 2)
    except: pass

    try:
        # SFS / Promo Campaigns
        camp_res = db.client.table("promo_campaigns").select("id", count="exact").eq(
            "status", "completed").gte("created_at", hace_un_mes).execute()
        datos["campanias_sfs_mes"] = camp_res.count or 0
        
        chan_res = db.client.table("channels").select("followers").eq("sfs_user_id", model_id).execute()
        if chan_res and chan_res.data:
            datos["canales_sfs"] = len(chan_res.data)
            datos["seguidores_telegram"] = sum(c.get("followers", 0) or 0 for c in chan_res.data)
    except: pass

    try:
        # Casino Activity
        cas_res = db.client.table("casino_bets").select("amount").eq("model_id", model_id).execute()
        if cas_res and cas_res.data:
            datos["casino_total_apuestas"] = len(cas_res.data)
            datos["casino_volumen"] = sum(float(b.get("amount", 0) or 0) for b in cas_res.data)
    except: pass

    return datos

# ================================================================
# 2. PROMPT BUILDING
# ================================================================

def _construir_prompt(datos: dict, score_info: dict, insights: list[dict], mes: int, anio: int) -> str:
    """Construye el prompt experto con todo el ecosistema Nebula."""
    ahora = datetime.utcnow()
    meses_es = {
        1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
        5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
        9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
    }
    nombre_mes = meses_es.get(mes, str(mes))
    fecha_actual_str = f"{ahora.day} de {meses_es.get(ahora.month)} de {ahora.year}"
    
    eventos_proximos = [f"{e['evento']} ({e['dia']}/{e['mes']}): {e['estrategia']}" 
                        for e in FECHAS_ESPECIALES if e["mes"] == mes]

    insights_texto = "\n".join([f"- '{i['action_key']}': {i['tasa_exito']}% exito" 
                               for i in sorted(insights, key=lambda x: x.get('tasa_exito', 0), reverse=True)[:5]])

    prompt = f"""Eres el Nebula Coach Pro, el Director Estrategico de Crecimiento para la agencia.
Tu mision es transformar Creadoras de Contenido en Super Estrellas usando TODO el ecosistema.

## KNOWLEDGE DE LA PLATAFORMA (Usa esto para tus planes):
1. FEED SOCIAL (Retention/Exposure): Publicar diario es vital para no ser olvidada.
2. HISTORIAS (Urgency): Uso de contenido efimero para ventas flash.
3. SISTEMA SFS (Growth): Promocion cruzada automatizada con otros canales de Telegram. Monitorea el Engagement Rate. Vital para conseguir trafico nuevo (Funnel).
4. CASINO & MINIJUEGOS (Gamification): La modelo debe configurar premios (fotos VIP, chats, descuentos) para que los fans apuesten creditos. Ideal para aumentar 'stickiness' y monetizar saldos bajos.
5. ESCROW SYSTEM (Trust): Garantiza seguridad en pagos P2P. Evita estafas.
6. BOT MANAGER (Conversion): El bot de Telegram que atiende 24/7. La modelo debe tener saldo de IA y configuracion de personalidad activa.
7. WALLET, REPUTACION & BLACKLIST: El score de reviews es el valor mas alto. La Lista Negra Global protege contra estafadores del ecosistema.
8. PESTANAS DEL FEED (Reciente, Top, Siguiendo): La modelo debe aspirar a aparecer en 'Top' para maxima exposicion gratuita.

## CONTEXTO TEMPORAL:
- Hoy: {fecha_actual_str}
- Festividades de este mes: {", ".join(eventos_proximos) if eventos_proximos else "Evergreen."}

## ANALISIS DE LA MODELO ACTUAL:
- Nombre: {datos.get('nombre_artistico', 'Modelo')} | Score: {score_info['score']}/100 ({score_info['nivel']})
- Visitas/Mes: {datos['visitas_ultimo_mes']} | Conversion: {datos['tasa_conversion']}%
- Ingresos/Mes: ${datos['ingresos_ultimo_mes']:.2f}
- SFS Actividad: {datos['campanias_sfs_mes']} campanias | {datos['seguidores_telegram']} followers en Telegram.
- Casino Actividad: {datos['casino_total_apuestas']} apuestas | Volumen: {datos['casino_volumen']} creditos.

## INSTRUCCIONES ESTRICTAS:
1. No ignores el CASINO ni el SFS. Si la modelo tiene pocas visitas, sugiere mas SFS. Si tiene visitas pero pocas ventas, sugiere configurar mejores premios en el CASINO.
2. Como DIRECTOR CREATIVO, da detalles practicos de produccion visual (iluminacion, lenceria, encuadres sugerentes).
3. Cada semana del plan debe tener un objetivo claro usando herramientas de Nebula.
4. Tono: Experto, motivador, directo y profesional del sector entretenimiento adulto.

## FORMATO DE RESPUESTA (JSON):
{{
  "diagnostico": {{ "nivel": "...", "score_general": {score_info['score']}, "fortalezas": [], "areas_criticas": [], "resumen": "..." }},
  "meta_del_mes": "...",
  "semanas": [
    {{
      "numero": 1, "foco": "...",
      "acciones": [
        {{
          "key": "snake_case_identificador",
          "categoria": "crecimiento|ventas|contenido|reputacion|monetizacion",
          "titulo": "...",
          "descripcion": "Instruccion detallada incluyendo lo visual y la herramienta Nebula a usar.",
          "impacto": "alto|medio|bajo", "tiempo_estimado": "...", "dato_colectivo": "..."
        }}
      ]
    }}
  ],
  "mensaje_motivacional": "..."
}}"""
    return prompt

# ================================================================
# 3. LLAMADA Y LOGICA (Siguen iguales, solo actualizamos el prompt y datos)
# ================================================================

def _llamar_ia_y_parsear(prompt: str) -> dict:
    """Llama a OpenRouter y parsea el JSON del plan con limpieza robusta."""
    client = _get_openrouter_client()
    modelos = [COACH_MODEL_PRINCIPAL, COACH_MODEL_FALLBACK, "google/gemini-pro-1.5"]
    
    for modelo in modelos:
        try:
            logger.info(f"[Coach] Intentando con modelo: {modelo}")
            resp = client.chat.completions.create(
                model=modelo, temperature=COACH_TEMP, max_tokens=COACH_MAX_TOKENS,
                messages=[{"role": "system", "content": "Eres Nebula Coach Pro. Tu UNICA salida debe ser un JSON valido. No incluyas texto explicativo antes ni despues."},
                          {"role": "user", "content": prompt}],
                timeout=60
            )
            contenido = resp.choices[0].message.content.strip()
            
            # Limpieza agresiva de JSON
            if "{" in contenido:
                inicio = contenido.find("{")
                fin = contenido.rfind("}") + 1
                contenido_limpio = contenido[inicio:fin]
                try:
                    return json.loads(contenido_limpio)
                except json.JSONDecodeError as je:
                    logger.error(f"[Coach] Error decode JSON de {modelo}: {je}. Contenido: {contenido[:100]}...")
            else:
                logger.error(f"[Coach] El modelo {modelo} no devolvio un JSON valido (no se encontro '{{').")
        except Exception as e:
            logger.error(f"[Coach] Error llamando a {modelo}: {str(e)}")
            continue

    raise RuntimeError("Fallo total de IA: Ninguno de los modelos seleccionados pudo generar un plan valido.")

def generar_plan_mensual(db, model_id: str, mes: int, anio: int, forzar: bool = False) -> dict:
    try:
        if not forzar:
            res = db.client.table("coach_plans").select("*").eq("model_id", model_id).eq("month", mes).eq("year", anio).maybe_single().execute()
            if res and res.data:
                return {"plan": res.data["plan_data"], "generado_en": res.data["generated_at"], "desde_cache": True}
        
        datos = _recolectar_datos_modelo(db, model_id)
        score_info = _calcular_score(datos)
        prompt = _construir_prompt(datos, score_info, _obtener_insights_colectivos(db), mes, anio)
        plan = _llamar_ia_y_parsear(prompt)
        
        ahora = datetime.utcnow().isoformat()
        db.client.table("coach_plans").upsert({
            "model_id": model_id, "month": mes, "year": anio, "plan_data": plan, "generated_at": ahora, "last_regenerated_at": ahora
        }).execute()
        
        return {"plan": plan, "generado_en": ahora, "desde_cache": False, "score": score_info["score"], "nivel": score_info["nivel"]}
    except Exception as e:
        logger.error(f"[Coach] Error global: {e}")
        raise

def _calcular_score(datos: dict) -> dict:
    # Metodologia de score simplificada y robusta
    score = min(datos["visitas_ultimo_mes"] / 200 * 20, 20)
    score += min(datos.get("tasa_conversion", 0) / 5 * 30, 30)
    score += min(datos["campanias_sfs_mes"] / 4 * 20, 20)
    score += min(datos["casino_total_apuestas"] / 10 * 15, 15)
    score += min(datos.get("total_reviews", 0) / 10 * 15, 15)
    
    score = round(min(score, 100))
    niveles = [(80, "SUPER STAR"), (65, "HOT CREATOR"), (45, "EN DESARROLLO"), (25, "RISING STAR"), (0, "NEW FACE")]
    nivel = next(nm for sc, nm in niveles if score >= sc)
    return {"score": score, "nivel": nivel}

def _obtener_insights_colectivos(db):
    try:
        res = db.client.table("coach_collective_insights").select("*").execute()
        return res.data or []
    except: return []

def registrar_feedback(db, model_id, plan_id, action_key, action_category, result, notes=None):
    try:
        db.client.table("coach_feedback").upsert({
            "model_id": model_id, "plan_id": plan_id, "action_key": action_key,
            "action_category": action_category, "result": result, "notes": notes,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return {"status": "ok"}
    except: raise

def obtener_insights_publicos(db):
    return [{"accion": i["action_key"], "tasa_exito": i["tasa_exito"]} for i in _obtener_insights_colectivos(db)]
