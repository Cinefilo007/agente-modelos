# SOP: Nebula Coach — Sistema de Consejero IA para Modelos

## 1. Propósito del Sistema

Nebula Coach es un consejero inteligente integrado en la mini app que:
1. **Analiza** la situación real de cada modelo (métricas reales de la plataforma).
2. **Genera planes mensuales personalizados** con acciones concretas y priorizadas por semana.
3. **Retroalimenta** la IA con éxitos y fracasos colectivos anónimos del ecosistema.
4. **Actúa** como experto en ventas, marketing digital, psicología social y Telegram.

**Filosofía**: No es un tutorial genérico. Es un análisis real de la situación actual de la modelo y un plan de acción ejecutable.

---

## 2. Flujo de Datos

```
Datos Reales de la Modelo
  ├── profile_views (tendencia de visitas)
  ├── escrow_orders (ventas, ingresos, tasa de conversión)
  ├── posts (frecuencia, engagement promedio)
  ├── channels/promo_campaigns (actividad SFS)
  ├── client_reviews (reputación, calificación)
  ├── models (estado, créditos, antigüedad)
  └── wallets (balance)
        +
Pool Colectivo Anónimo (coach_collective_insights)
  └── Qué acciones tienen alta/baja tasa de éxito en el ecosistema
        ↓
  PROMPT CONTEXTUAL → OpenRouter IA → PLAN JSON ESTRUCTURADO
        ↓
  coach_plans (guardado en DB, un plan por mes por modelo)
        ↓
  La modelo ejecuta acciones → Marca ✅ / ❌ (coach_feedback)
        ↓
  feedback alimenta el pool colectivo para futuros planes
```

---

## 3. Estructura del Plan Generado (JSONB)

```json
{
  "diagnostico": {
    "nivel": "En Desarrollo",
    "score_general": 62,
    "fortalezas": ["Buena frecuencia de posts", "Canal SFS activo"],
    "areas_criticas": ["Tasa de conversión baja (< 2%)", "Sin reviews aún"],
    "resumen": "Texto de análisis situacional personalizado..."
  },
  "meta_del_mes": "Descripción de la meta principal para el mes",
  "semanas": [
    {
      "numero": 1,
      "foco": "Nombre del foco estratégico de la semana",
      "acciones": [
        {
          "key": "identificador_unico_accion",
          "categoria": "crecimiento|ventas|contenido|reputacion|monetizacion",
          "titulo": "Título corto de la acción",
          "descripcion": "Descripción detallada de qué hacer y cómo",
          "impacto": "alto|medio|bajo",
          "tiempo_estimado": "30 min/día",
          "dato_colectivo": "El 78% de modelos que hacen esto ven +40% de visitas"
        }
      ]
    }
  ],
  "mensaje_motivacional": "Mensaje personalizado y alentador..."
}
```

---

## 4. Niveles de la Modelo (Gamificación)

| Score | Nivel | Descripción |
|-------|-------|-------------|
| 0-25 | 🌱 New Face | Recién comenzando, sin ventas ni seguidores |
| 26-45 | ⭐ Rising Star | Presencia inicial, primeras interacciones |
| 46-65 | 💫 En Desarrollo | Crecimiento activo, ventas consistentes |
| 66-80 | 🔥 Hot Creator | Alto engagement y ventas regulares |
| 81-100 | 👑 Super Star | Top performer del ecosistema |

El score se calcula en base a:
- Vistas del perfil (20%)
- Tasa de conversión (30%)
- Frecuencia de publicación (15%)
- Actividad SFS (20%)
- Calificación de reviews (15%)

---

## 5. Reglas de Negocio

### Generación del Plan
- Se genera **automáticamente** al inicio de cada mes para models activas.
- Si no existe plan para el mes actual, se genera al primer acceso.
- **Regeneración manual**: Máximo 1 por semana (cooldown de 7 días desde `last_regenerated_at`).
- El plan es **gratis** — no consume créditos. Es una herramienta de retención y crecimiento.

### Pool Colectivo
- Solo se usan datos de feedback donde `result != 'pending'`.
- Se requiere mínimo 3 respuestas para que una acción aparezca en el pool (estadísticamente válido).
- El dato_colectivo en el plan es generado por la IA basándose en los insights del pool.

### Privacidad
- El pool colectivo es **100% anónimo**. Nunca se expone qué modelo tomó qué acción.
- Solo se exponen estadísticas agregadas (tasas de éxito anónimas).

---

## 6. Categorías de Acciones

| Categoría | Descripción | Ejemplos |
|-----------|-------------|---------|
| `crecimiento` | Aumentar seguidores y visibilidad | SFS, colaboraciones, posts virales |
| `ventas` | Mejorar conversión y cerrar ventas | Ofertas, precios, estrategia de cierre |
| `contenido` | Calidad y frecuencia de publicación | Calendario editorial, tipos de contenido |
| `reputacion` | Construir reputación y confianza | Pedir reviews, responder comentarios |
| `monetizacion` | Maximizar ingresos per follower | Precios, bundles, servicios premium |

---

## 7. Modelo de IA

- **Modelo principal**: `google/gemini-2.5-flash-preview` (el más capaz y rápido de Gemini)
- **Fallback**: `google/gemini-flash-1.5` si el modelo principal falla
- **Temperatura**: 0.7 (balance entre creatividad y coherencia)
- **Max tokens**: 2500 (suficiente para el plan JSON completo)

---

## 8. Archivos del Sistema

| Archivo | Función |
|---------|---------|
| `db/024_nebula_coach.sql` | Tablas `coach_plans` y `coach_feedback`, vista `coach_collective_insights` |
| `src/services/coach_service.py` | Lógica de recolección de datos, prompt building, llamada IA y parseo |
| `src/api/routes/coach.py` | Endpoints REST del Coach |
| `web/src/pages/NebulaCoach.jsx` | Panel principal del Coach en el frontend |
| `web/src/components/coach/PlanSemanal.jsx` | Visualización de semanas y acciones |
| `web/src/components/coach/DiagnosticoCard.jsx` | Card de diagnóstico y score |

---

*Última Actualización: Marzo 2026*
