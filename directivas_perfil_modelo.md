# Directivas del Sistema: Perfil de Modelos

Esta documentación marca las líneas maestras y la separación de preocupaciones para el módulo del perfil de modelos. Debe ser consultada antes de implementar código real.

## 1. Modularidad y Separación de Preocupaciones (SOPs)

### Capa de Presentación (UI / Ejecución)
- **Vista Principal (`ProfilePage`):** Encargada únicamente de orquestar los componentes visuales. Debe ser agnóstica a cómo se obtienen los datos.
- **Componentes Hijos (Modulares):**
  - `ProfileHeader`: Maneja fotos de portada, perfil, username, bio, stats y redes sociales.
  - `ServiceBadges`: Iterador de etiquetas/chips visuales que recibe un array de strings/objetos con los servicios disponibles.
  - `ProfileTabs`: Navegación interna (Posts, Servicios Escrow, Reviews).
  - `ThemeCustomizer`: Panel flotante o settings para que la modelo gestione el fondo y las fuentes.

### Capa Lógica y Estado (Business Logic)
- **Hooks Personalizados:** `useModelProfile()`, `useProfileCustomization()` para gestionar el estado, llamadas a la API y sincronización.
- **Gestor de Temas:** El estado del tema (colores, fondos, tipografía) debe inyectarse globalmente en el contenedor del perfil mediante variables CSS o un provider de Theme para evitar "prop drilling".

## 2. Estética y Diseño Premium
- **Aesthetic:** Minimalista, elegante. Soporte prioritario para Dark Mode o fondos personalizados (Glassmorphism para asegurar legibilidad frente a cambios de fondo).
- **Consistencia:** Tipografías modernas sin gracias (Ej: Inter, Roboto). Sombras suaves y microinteracciones en los botones (ej: hover en badges de servicios).

## 3. Próximos Pasos (Workflow)
1. Aprobar y generar Mockups (vía Stitch).
2. Definir esquemas Json/DB para almacenar las "Opciones de personalización" de cada modelo en el backend.
3. Maquetar los nuevos componentes con React/Tailwind/CSS según se defina en el diseño final.
