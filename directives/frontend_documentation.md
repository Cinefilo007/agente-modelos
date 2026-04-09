# Documentación del Frontend - Agente de Modelos

Este documento sirve como guía centralizada para el desarrollo, mantenimiento y evolución de la aplicación web (Frontend) del proyecto. Detalla la arquitectura, decisiones de diseño y el historial de cambios relevantes.

## 1. Stack Tecnológico

-   **Framework Principal**: React v18+
-   **Build Tool**: Vite
-   **Estilos**: Tailwind CSS v4 (con `@theme` customizado)
-   **Routing**: React Router DOM v6
-   **Iconos**: Lucide React
-   **Gestión de Estado**: Context API (`AuthContext`, `ThemeContext`)
-   **Integración**: Telegram WebApp SDK (previsto)

## 2. Estructura del Proyecto (`/web`)

La aplicación reside en la carpeta `web/` y sigue una estructura modular estándar:

-   `src/components/`: Componentes reutilizables (UI, Layouts, Cards).
-   `src/pages/`: Vistas completas correspondientes a rutas (Feed, Perfil, Explorar).
-   `src/context/`: Lógica global de estado (Autenticación, Tema).
-   `src/lib/`: Utilidades y configuraciones (ej. axios, utils).
-   `src/assets/`: Recursos estáticos.

## 3. Sistema de Diseño y UI

### 3. Sistema de Diseño y UI

### Estética "Premium & Dark"
El diseño se centra en una experiencia visual impactante y moderna:
-   **Fondo**: Dinámico, coloreado sutilmente con el `themeColor` del usuario mediante gradientes radiales y cónicos sobre base negra.
-   **Color Acento**: Personalizable por usuario, afecta a botones, bordes y brillos.
-   **Glassmorphism**: Uso extensivo de fondos translúcidos con `backdrop-blur` para paneles y navegación.
-   **Protección de Contenido**: Se ha **deshabilitado globalmente el click derecho** (`contextmenu`) para dificultar la descarga de imágenes y videos.

### 3.1 Layout Responsivo (Tablet/Mobile First)
Para garantizar una experiencia consistente entre dispositivos móviles (Telegram) y escritorio, se ha implementado una restricción de diseño:

-   **Vista Móvil (< 768px)**: La aplicación utiliza el 100% del ancho disponible.
-   **Vista Escritorio (>= 768px)**:
    -   La interfaz principal se restringe a un contenedor central de **768px** de ancho máximo.
    -   El contenedor está centrado en la pantalla con un fondo exterior dinámico.
    -   Simula la experiencia de uso en una tablet/móvil de alta gama.

## 4. Componentes Clave

### `Layout.jsx`
Controla la estructura base de la aplicación.
-   **Seguridad**: Bloqueo global de eventos `contextmenu`.
-   **Tema**: Implementa el fondo dinámico basado en `ThemeContext`.
-   **Navegación**: Barra inferior (`Bottom Navigation`) posicionada de forma absoluta.
-   **Restricciones**: Implementa la lógica de ancho máximo para escritorio.
-   **Contención de Elementos Fijos**: Utiliza la propiedad `transform-gpu` en el contenedor principal. Esto crea un nuevo contexto de apilamiento (stacking context), forzando a que cualquier hijo con `position: fixed` (como cabeceras de detalle o formularios) se posicione relativo al contenedor de la "tablet" y no al viewport del navegador.

### Rutas Principales (`App.jsx`)
Todas las rutas se encuentran anidadas bajo el componente `Layout` para garantizar la consistencia visual y estructural.
-   `/` (Feed): Listado de publicaciones.
-   `/explore` (Explorar): Descubrimiento de contenido.
-   `/profile` (Perfil): Vista del usuario actual.
-   `/notifications` (Alertas): Centro de notificaciones.
-   `/create-post`: Creación de contenido.
-   `/post/:id`: Detalle de una publicación específica.

## 5. Historial de Cambios e Implementaciones

### Fase 1: Inicialización y Estructura Base
-   Configuración de Vite + React + Tailwind.
-   Creación de sistema de rutas.
-   Definición de variables de CSS globales.

### Fase 2: Componentes Core
-   Implementación de `Feed` y `FeedPostCard`.
-   Creación de vista de `Perfil` con cabecera visual.
-   Añadido `AuthContext` y `ThemeContext` para manejo de sesión y temas.

### Fase 3: Refinamiento de UX/UI (Actual)
-   **Ajuste de Vista Escritorio**: Se modificó `Layout.jsx` para evitar que la app se "estire" en pantallas grandes, confinándola a una vista tipo tablet centrada.
-   **Navegación**: Ajuste de la barra de navegación para respetar los límites del contenedor central.
-   **UI del Feed**: Simplificación de `FeedPostCard` eliminando la caja de comentarios rápida para una estética más limpia y usando iconos minimalistas (flechas) para expandir/retraer el texto de la publicación. La interacción completa se delega a la vista de detalle.

## 6. Guías para Futuras Correcciones

1.  **Mantener la Relación de Aspecto**: Cualquier nueva vista o modal debe respetar el ancho máximo de `768px` definido en el Layout. No crear elementos `fixed` que tomen el `100vw` sin considerar el contenedor padre.
2.  **Estilos Globales**: Usar siempre las variables definidas en `index.css` o las clases de utilidad de Tailwind consistentes con el tema oscuro.
3.  **Componentes Reutilizables**: Priorizar la creación de componentes en `src/components/ui` para botones, inputs y tarjetas estándar.
4.  **Mobile First**: Diseñar siempre pensando en cómo se ve en un móvil primero.
