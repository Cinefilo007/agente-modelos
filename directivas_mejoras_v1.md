# Documentación Completa del Sistema y Guía de Mejoras (v1)

Este documento contiene la documentación de las últimas mejoras introducidas en los Bots de Fans y Creadoras, sirviendo como guía de referencia para cualquier desarrollo futuro.

## 1. Bot de Fans (Consumer Bot)

### Catálogo de Modelos (Paginación Individual)
- Se ha cambiado el límite de modelos por página a **1** (`MODELS_PER_PAGE = 1`). Esto asegura que el fan pueda concentrarse en una modelo a la vez.
- La navegación es 100% asíncrona mediante botones inline integrados directamente en la tarjeta de la modelo para avanzar y retroceder sin pérdida de contexto.

### Ratings (Puntajes de Reputación)
- El rating de cada modelo se muestra en formato numérico base 5 (`f"{score}/5"` o `f"{score:.1f}/5"`).
- Ejemplo visual: `⭐ Rating: 4.5/5`.

### Exposición de Servicios de la Modelo
- Se extraen y listan los servicios guardados en la columna `services` de la tabla `models`.
- Ejemplo visual: `💼 Servicios: Baile, Video Chat`.

### Enlace al Perfil de la Modelo
- El botón "Ver Perfil" apunta directamente a la ruta de la WebApp de NebulaStar: `https://nebulastar.app/[username]`.

### Control de Duplicación en Reviews
- Si un fan intenta dejar una review sobre una modelo que ya ha calificado previamente, se dispara una alerta popup de Telegram (`show_alert=True`) de forma inmediata, junto con el mensaje de texto de advertencia.

---

## 2. Bot de Creadoras (Creator Bot)

### Menú Inferior Persistente
- Se ha habilitado un menú `ReplyKeyboardMarkup` persistente (`is_persistent=True`) para las creadoras, mejorando la comprensión de las funcionalidades del bot.
- Opciones de menú:
  - `👤 Mi Perfil` -> Muestra el perfil y detalles.
  - `🛡️ Lista Negra` -> Abre el flujo para añadir usuarios problemáticos a la lista negra global.
  - `🔍 Consultar ID` -> Instrucciones sobre el comando `/consultarbl`.
  - `✨ Entrar a NebulaStar` -> Abre la WebApp para creadoras.

- El enrutamiento de los mensajes se maneja en el bot de forma centralizada para que sea consistente.
