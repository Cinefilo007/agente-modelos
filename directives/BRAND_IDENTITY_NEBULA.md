# 🌌 DIRECTIVA: Identidad de Marca "Nebula"

Esta directiva establece los estándares obligatorios para la comunicación visual y verbal de la marca **Nebula**. Todos los componentes de software, piezas gráficas e interacciones del sistema deben alinearse con estos principios.

## 1. SOP: Pilares Estratégicos

### 1.1 El Concepto Central
La marca se basa en la metáfora astronómica donde **el talento (las modelos) son estrellas individuales** que, al agruparse bajo la plataforma, conforman un cuerpo celeste majestuoso, místico y poderoso: **La Nebulosa (Nebula)**.

### 1.2 El Slogan Institucional
> **"Sola eres una estrella. Juntas somos Nebula."**

Este lema debe utilizarse en:
- Landing pages (sección hero).
- Pantalla de bienvenida del bot de Telegram.
- Firma de correos informativos.

### 1.3 Voz y Tono
- **Voz:** Sofisticada, profesional, exclusiva y empoderadora.
- **Tono:** Minimalista. "Menos es más". El lujo se transmite a través del espacio en blanco (o vacío oscuro) y la precisión.

---

## 2. SOP: Identidad Visual y Diseño

### 2.1 El Logotipo y Símbolo (Design Concept)
- **Isotipo (Símbolo):** Una forma orgánica sólida de una nebulosa. En lugar de una estrella única, incorpora una **constelación** (múltiples puntos brillantes de diferentes tamaños) distribuida de forma elegante dentro de la masa púrpura.
- **Logotipo (Texto):** Tipografía personalizada con curvas fluidas, modernas y grosores variables, inspirada en una estética de lujo digital contemporáneo (ej. rebrand de OnlyFans).
- **Legibilidad:** El diseño debe ser 100% sólido (sin líneas finas) para garantizar la escalabilidad en avatares de redes sociales y favicons.

### 2.2 Paleta de Colores Oficial (Sync Frontend)
Los códigos de color están sincronizados con `web/src/index.css`:
- **Deep Indigo (Fondo Principal):** `#1E1B4B`
- **Electric Purple (Primario):** `#A855F7`
- **Magenta/Pink (Resalte):** `#EC4899`
- **Stellar White (Brillos):** `#FFFFFF`

### 2.3 Tipografía del Sistema
- **Titulares:** Tipografía *Display* con curvas elegantes (*Custom Typography*).
- **Cuerpo de Texto:** *Inter* o *sans-serif* limpio para máxima legibilidad.

---

## 3. Ejecución: Implementación Técnica

### 3.1 Variables de Tailwind (Tokens)
El archivo `tailwind.config.js` debe mapear los colores de marca de la siguiente manera:
```javascript
colors: {
  primary: "#A855F7",    // Electric Purple
  accent: "#EC4899",     // Magenta
  background: "#1E1B4B", // Deep Indigo
}
```

### 3.2 Assets de Marca
- Los logos deben almacenarse en formato SVG en `web/src/assets/logo/` para evitar pixelación y asegurar carga rápida.
- El isotipo (símbolo) se usará como `favicon.ico`.

---

## 4. Criterios de Éxito
- La interfaz se siente "Premium" y "Gama Alta" desde el primer vistazo.
- Los usuarios asocian inmediatamente el morado eléctrico y la constelación con la marca.
- El lema se repite consistentemente en todos los puntos de contacto.

---
*Última Actualización: 10 de Abril de 2026*
