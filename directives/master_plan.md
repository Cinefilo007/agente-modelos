# MASTER PLAN: Ecosistema de Automatización Agencia de Modelos

## 1. Contexto del Sistema
Este sistema está diseñado bajo la filosofía de "Mejora Infinita", funcionado en tres niveles jerárquicos:
1.  **Planificación**: Documentada exhaustivamente en directivas Markdown (SOPs).
2.  **Coordinación**: Gestionada por el Agente (Antigravity), asegurando que se cumplan los SOPs.
3.  **Ejecución**: Realizada por una aplicación **Python modular** (sin dependencias de n8n).

## 2. Modelos de Negocio y Operación

### Modelo de Ingresos: Créditos por Interacción
-   **Concepto**: Las modelos pagan por el uso del bot consumiendo "Créditos de IA" por cada interacción con leads.
-   **Plan de Prueba**: Créditos gratuitos iniciales para demostración.
-   **Precios**: Configurables por el administrador (dueño).

### Fase A: Captación y Onboarding (Hunter)
-   **Flujo**: Link -> Venta del Bot -> Interés -> Verificación -> Configuración.
-   **Verificación de Identidad**:
    -   **Flujo Encuesta**: Nombre -> Edad -> País -> Selfie con Documento -> Video Note.
    -   **Validación**: Admin recibe resumen con botones y los archivos multimedia.
    -   **Feedback**: Aprobación activa configuración / Rechazo o Repetición notifican a la modelo.
-   **Configuración Inicial y Gestión**:
    -   `/perfil`: Ver y editar ficha técnica (Personalidad, Físico, Precios).
    -   `/recargar`: Comprar paquetes de créditos.
    -   `/dar_creditos [id] [monto]`: (Admin) Bonificar créditos manualmente.
    -   `/paquetes`: (Admin) Gestión CRUD de paquetes (Listar, Crear, Editar, Activar).
    -   `/modelos`: (Admin) Gestión CRUD de modelos (Listar, Ver Ficha, Editar Saldo, Eliminar).
    -   Vinculación Telegram Business.
    -   Definición de Precios, Personalidad, Rasgos Físicos.
    -   Métodos de Pago por país.

### Fase B: Gestión de Leads (Manager)
-   **Rol**: Asistente de ventas automatizado (Personalidad: L3 Euryale 70B para evitar filtros).
-   **Mecánica**:
    -   No pregunta presupuesto, ofrece precios directos.
    -   Cierre: Pregunta País y Método de Pago.
    -   **Handover**: Notifica a la modelo con datos del lead y botón directo al chat para cerrar la venta.
    -   Consumo de créditos en tiempo real.
-   **Lista Negra Global**:
    -   Las modelos pueden reportar clientes ("Hacer perder el tiempo", "Estafa").
    -   Reporte -> Se guarda en DB -> Si se aprueba (o automático según configuración) -> Ban Global.
    -   Un cliente en Lista Negra es ignorado por el bot en TODAS las modelos para proteger el ecosistema.

### Fase C: Red Social Híbrida (Super Star)
-   **Mini App (Telegram WebApp)**:
    -   Interfaz nativa dentro de Telegram para modelos y clientes.
    -   **Perfil Premium**: 
        -   Foto de portada, avatar, bio corta, seguidores, me gustas.
        -   **Personalización**: Color de perfil configurable por la modelo (se guarda en DB).
        -   **Estado**: Indicador Online / Última vez conectado.
        -   **Historias**: Carrusel estilo Instagram debajo de links sociales.
    -   **Feed Social**: Posts (foto/video) con diseño futurista.
        -   Pestañas: Recientes, Top, Siguiendo.
        -   Interacciones: Likes, Comentarios, Reportar (Cliente) / Editar, Eliminar (Modelo).
        -   **Notificaciones**: Vista dedicada para la modelo (nuevos seguidores, likes, etc.).
    -   **Sistema de Reviews**: Reseñas visibles de clientes.
    -   **Sistema de Reviews**: Reseñas visibles de clientes (Gamefication: "New Face" -> "Super Star").
    -   **Sistema de Reviews**: Reseñas visibles de clientes (Gamefication: "New Face" -> "Super Star").
-   **Interacciones**:
    -   Likes y Comentarios en posts.
    -   Validación de `initData` de Telegram para autenticar usuarios.

### Fase D: Administración y Control (God Mode)
-   **Super Admin Dashboard** (`/super-admin`):
    -   **KPIs Globales**: Ingresos, Modelos Activas, Verificaciones Pendientes.
    -   **Gestión de Modelos**: Tabla maestra para activar/pausar/banear modelos.
    -   **Lista Negra Global**: ABM (Alta/Baja/Modificación) de usuarios vetados.
-   **Panel de Modelo** (`/admin-panel`):
    -   **Estadísticas Personales**: Visitas, Ventas, Créditos.
    -   **Configuración Bot**: Precios, Personalidad, Físico (Tags).
    -   **Lista Negra**: Vista de solo lectura para alerta preventiva.

### Fase E: Economía P2P y Seguridad (Escrow System)
-   **Perfil de Cliente**:
    -   Vista simple: Avatar, Nombre Manual (no username real por privacidad), Modelos Seguidas.
    -   **Wallet**: Saldo interno recargable vía Telegram Wallet (Crypto).
    -   **Reputación**: Calificación visible (basada en reviews de modelos).
-   **Flujo de Compra Segura (Escrow)**:
    1.  Cliente contrata servicio -> Fondos retenidos por plataforma (Estado: *Held*).
    2.  Modelo entrega servicio -> Marca *Entregado*.
    3.  Cliente confirma -> Fondos liberados al saldo de la modelo (Estado: *Released*).
    4.  Cliente reclama -> Estado *Disputed*.
-   **Sistema de Disputas**:
    -   **Evidencia**: Cliente y Modelo suben pruebas (screenshots, video).
    -   **Resolución**: Super Admin revisa. 
        -   Gana Modelo: Fondos a su wallet.
        -   Gana Cliente: Refund a su saldo.
-   **Ecosistema de Confianza**:
    -   Modelos califican clientes tras finalizar servicio.
    -   Alertas automáticas si un cliente tiene bajo puntaje.

## 3. Reglas de Trabajo (Sistema de Mejora Infinita)
1.  **SOP First**: NUNCA escribir código sin antes definir o actualizar la directiva correspondiente en `/directives`.
2.  **Determinismo**: La lógica de ejecución debe ser clara, modular y mantenible en Python.
3.  **Single Source of Truth**: Supabase (PostgreSQL) es la base de datos maestra. Supabase Storage para multimedia.
4.  **Infraestructura**: Despliegue en Railway (Bot + API).

## 4. Estructura de Archivos (Python Monolith)
-   `/src`: Código fuente principal.
    -   `/bot.py`: Entry point y configuración del `ApplicationBuilder`.
    -   `/handlers`: Módulos de lógica:
        -   `onboarding.py`: Flujo de verificacion y registro.
        -   `profile.py`: Gestión de perfil (ver/editar) y menú principal modelo.
        -   `credits.py`: Sistema de compras, listado de paquetes y recargas.
        -   `admin.py`: Herramientas de administración y aprobación.
    -   `/services`: Capa de servicio (Supabase, AI/OpenRouter).
    -   `/utils`: Helpers (loggers, validadores).
-   `/directives`: Reglas de negocio, guiones de venta, SOPs técnicos.
-   `/db`: Scripts SQL y migraciones (`002_add_credits.sql`).

## 5. Sistema de Créditos y Economía
-   **Moneda**: Créditos (Diamantes).
-   **Tablas**: 
    -   `credit_packages`: Definición de paquetes (Starter, Pro, Agency).
    -   `credit_transactions`: Historial de movimientos.
-   **Flujo de Recarga**:
    1.  Modelo usa `/recargar` -> Elige paquete.
    2.  Admin recibe alerta en su chat privado con datos y botón [Aprobar].
    3.  Al aprobar, se suma saldo y notifica a la modelo.
-   **Comandos Admin**: `/dar_creditos [id] [cantidad]` para ajustes manuales.

## 6. Tecnologías Clave
-   **Lenguaje Backend**: Python 3.10+ (Bot + API FastAPI).
-   **Frontend Mini App**: React + Vite + **Tailwind CSS**.
-   **Framework Bot**: `python-telegram-bot` (v20+ Async).
-   **Motor IA**: OpenRouter API (`openai` python client).
-   **Base de Datos**: Supabase (PostgreSQL + Storage).
-   **Despliegue**: Railway (Docker).

## 7. Estado Actual de Implementación (Hitos Completados)

### 7.1 Autenticación y Seguridad
-   **Sistema Híbrido**: Validación de `initData` de Telegram + JWT propio.
-   **Roles de Usuario**: Soporte para `model` (Creador), `client` (Fan), y `admin` (Administrador).
-   **Gestión de Admins**: Tabla dedicada `admins` en base de datos para asignar roles (`owner`, `moderator`) y permisos granulares, eliminando hardcoding.
-   **Protección de Rutas**: Middleware en Frontend (`ProtectedRoute`) que valida token y completitud del perfil (Términos, Edad).

### 7.2 Onboarding y Verificación
-   **Flujo Diferenciado**:
    -   **Fans**: Selección de Avatar, Confirmación de Edad (+18), Aceptación de T&C.
    -   **Creadores**: Formulario completo + Selfie con Documento (ID).
-   **Verificación Automática/Manual**:
    -   Carga de evidencia a Bucket `verifications` (con auto-creación de bucket si falla).
    -   Notificación inmediata a Telegram del Admin con foto y botones de Aprobar/Rechazar.
    -   Fallback a texto con enlace si la API de Telegram falla al renderizar la imagen.

### 7.3 Experiencia de Administrador (God Mode)
-   **Dashboard Integrado**: Acceso directo desde el perfil.
-   **Feed de Moderación**: 
    -   Vista idéntica al usuario pero sin interacciones sociales (Likes/Comentarios ocultos).
    -   Botón **Eliminar** (Papelera) en cada post.
    -   Registro de motivos de eliminación.
-   **Navegación Simplificada**: Menú adaptado que oculta "Crear Post" y "Notificaciones" para centrarse en la gestión.

### 7.4 Infraestructura y Robustez
-   **Storage Inteligente**: Detección y auto-creación de buckets de Supabase (`verifications`, `posts`, `stories`) para evitar errores 500.
-   **Logging Extendido**: Trazabilidad completa en backend (`auth.py`, `profile.py`) para depuración rápida en Railway.
