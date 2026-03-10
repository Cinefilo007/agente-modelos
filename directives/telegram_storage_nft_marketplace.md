# Directiva: Almacenamiento Seguro TON Storage, NFT y Marketplace

Este documento define el estándar para la implementación del sistema de almacenamiento descentralizado usando TON Storage, el cifrado de contenido, la tokenización (NFT) y el mercado de subastas.

## 1. Almacenamiento Seguro (TON Storage)

Para garantizar la descentralización y evitar la dependencia de canales de Telegram, utilizaremos **TON Storage**.

### 1.1 Arquitectura de Almacenamiento
- **Proveedor**: Red TON (TON Storage).
- **Protocolo**: Los archivos se suben a la red descentralizada de TON.
- **Persistencia**: Supabase guardará el `Bag ID` (identificador único del archivo en TON Storage).

### 1.2 Capa de Cifrado (SOP-CRYPTO)
- **Algoritmo**: AES-256-GCM.
- **Flujo**:
    1. El archivo se cifra en el servidor.
    2. Se sube a TON Storage. La red almacena el archivo cifrado.
    3. La **Clave de Contenido (CK)** y el **Bag ID** se guardan en Supabase.
    4. El acceso se gestiona mediante la validación de propiedad (NFT o compra directa).

## 2. Tokenización NFT (Contenido Exclusivo)

El contenido más valioso de las modelos podrá convertirse en un NFT único para certificar propiedad y rastrear la distribución.

### 2.1 Red Blockchain y Billeteras
- **Elegida**: **TON (The Open Network)** por su integración nativa con Telegram.
- **Tipos de Billetera Admitidos**:
    1.  **Nativa (Recomendada)**: Uso de `@wallet` de Telegram. Fricción mínima, el usuario la activa con un clic.
    2.  **Externa**: Conexión vía TON Connect (Tonkeeper, etc.) para usuarios que prefieren control total.
    3.  **Gestionada (Opcional)**: En una fase avanzada, la plataforma podría manejar billeteras internas para usuarios que solo quieren comprar con créditos sin saber de crypto.

### 2.2 Atributos del NFT
- **Metadata**: Almacenada en IPFS o Supabase (URL firmada).
- **Propietario**: Dirección de billetera TON del usuario.
- **Vínculo Físico**: El NFT otorga el derecho de acceso al contenido cifrado en la plataforma.

## 3. Marketplace y Subastas

Sistema de intercambio de activos digitales entre usuarios.

### 3.1 Mecánica de Subasta
- **Tipo**: Subasta inglesa (Puja más alta).
- **Duración**: Configurable por el vendedor.
- **Garantía**: Los fondos se bloquean en el contrato inteligente de la subasta.

### 3.2 Regalías en Cascada (Cascading Royalties)
Cada reventa del NFT ejecuta una distribución automática de los fondos:
1.  **Plataforma**: X% (Comisión por servicio).
2.  **Modelo (Creadora Original)**: Y% (Derechos de autor perpetuos).
3.  **Vendedor Actual**: Restante.
4.  **Incentivo Cliente (Opcional)**: Z% (Para el primer comprador si así se configura).

## 4. Marcas de Agua (Antipiratería)

Protección visual para contenido público y privado.

### 4.1 Posts Públicos
- Marca de agua estática/semi-transparente con el logo de la plataforma y el nombre de la modelo.
- Ubicación aleatoria o en esquinas para no arruinar la estética pero evitar robo.

### 4.2 Posts Privados (Pagados)
- **Marca de Agua Dinámica**: Incluye el `user_id` o `username` del cliente que compró el contenido.
- **Propósito**: Si el contenido se filtra, se sabe exactamente quién lo publicó.

## 5. Estrategia de Monetización

Para asegurar la sostenibilidad financiera sin que la plataforma cubra los costos operativos:

1.  **Fee de Cifrado/Almacenamiento**: Las modelos pagan una pequeña fracción de créditos por cada post que use TON Storage. Esto cubre el costo del "Storage Provider" en la red TON.
2.  **Costo de Acuñación (Minting)**: El usuario o la modelo cubren el "gas fee" de la red TON al crear el NFT.
3.  **Comisión de Marketplace**: 5-10% de cada subasta exitosa para la plataforma.
4.  **Almacenamiento Persistente**: La plataforma gestiona el pago de renta por el almacenamiento en TON para asegurar que el contenido no expire.

## 6. Pros y Contras

### Pros
- **Descentralización**: El contenido no depende de una sola empresa o servidor (ni siquiera Telegram).
- **Seguridad**: Cifrado grado militar; nadie puede ver el contenido sin las llaves gestionadas por tu plataforma.
- **Inmutabilidad**: Una vez en TON Storage, el contenido es difícil de censurar o eliminar accidentalmente.
- **Valor**: Los NFTs en TON tienen un mercado creciente y tecnológico de vanguardia.

### Contras
- **Costo Operativo**: A diferencia de Telegram, TON Storage requiere un pequeño pago recurrente por el almacenamiento (renta).
- **Complejidad Técnica**: La integración con TON Storage es más avanzada que usar la API de Telegram.
- **Velocidad**: La propagación inicial en la red descentralizada puede ser más lenta que subir a un servidor centralizado.

## 7. Esquema de Base de Datos (TON & Marketplace)

Para gestionar la descentralización y los pagos de renta, se añaden las siguientes tablas al sistema.

### 7.1 Gestión de Almacenamiento (TON Storage)
Cada archivo subido a la red TON tiene un costo de "renta" que los nodos cobran por mantener los datos.

```sql
-- Registro de archivos en la red descentralizada
CREATE TABLE ton_storage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL, -- Referencia a models.id o clients.id
    bag_id TEXT UNIQUE NOT NULL, -- Hash identificador en TON Storage
    encryption_key TEXT NOT NULL, -- Llave AES cifrada para este archivo
    file_name TEXT,
    file_size BIGINT, -- Tamaño en bytes
    rental_status TEXT CHECK (rental_status IN ('active', 'warning', 'expired')) DEFAULT 'active',
    last_rental_payment TIMESTAMPTZ DEFAULT NOW(),
    rental_expiry TIMESTAMPTZ NOT NULL, -- Fecha límite del próximo pago de renta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de pagos de renta y conversión a Créditos
CREATE TABLE ton_rental_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES ton_storage_items(id),
    amount_ton DECIMAL(20, 9) NOT NULL, -- Monto pagado a la red TON
    equivalent_credits INTEGER NOT NULL, -- Lo que se le descontó al usuario en la plataforma
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Módulo NFT y Marketplace
Gestión de títulos de propiedad y subastas.

```sql
-- Registro de NFTs acuñados
CREATE TABLE nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    on_chain_address TEXT UNIQUE, -- Dirección del smart contract en TON
    collection_address TEXT,
    owner_id UUID NOT NULL,
    content_item_id UUID REFERENCES ton_storage_items(id),
    metadata JSONB, -- Atributos, nombre, descripción
    minted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace de Subastas
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id),
    seller_id UUID NOT NULL,
    listing_type TEXT CHECK (listing_type IN ('auction', 'fixed')) DEFAULT 'auction',
    starting_price DECIMAL(10, 2) NOT NULL, -- En Créditos/Diamantes
    current_bid DECIMAL(10, 2),
    highest_bidder_id UUID,
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('active', 'sold', 'cancelled')) DEFAULT 'active',
    royalties_config JSONB -- { platform: 5, model: 10, reseller: 2.5 }
);
```

## 8. Lógica del "Rental Manager" (SOP-RENT)

Para que el administrador no tenga que pagar manualmente la renta de miles de archivos:

1.  **Cron Job Diario**: Un proceso revisa la tabla `ton_storage_items` buscando registros donde `rental_expiry` sea menor a 48 horas.
2.  **Cálculo de Costo**: Se consulta el precio actual del almacenamiento en TON y se convierte a Créditos internos (usando una tasa de cambio configurada por el Admin + un margen de ganancia).
3.  **Cobro Automático**:
    -   Se descuentan los Créditos del `owner_id`.
    -   Se actualiza `rental_expiry` por 30 días adicionales (o el periodo contratado).
    -   Se registra la transacción en `ton_rental_logs` y `transactions`.
4.  **Falta de Saldo**:
    -   Si el usuario no tiene créditos, el estado cambia a `warning` y se envía una notificación push/telegram: *"Tu contenido exclusivo está en riesgo de ser eliminado por falta de saldo"*.
    -   Tras 7 días en `warning` sin pago, el sistema deja de renovar el contrato en TON Storage y el estado pasa a `expired`.

## 9. Seguridad en Marcas de Agua Dinámicas

El servidor genera la marca de agua al momento de la solicitud:

1.  **Solicitud de Visualización**: El cliente pide ver un NFT comprado.
2.  **Procesamiento**:
    -   Se descarga el fragmento/archivo de TON Storage.
    -   Se descifra con la `encryption_key`.
    -   Se aplica marca de agua usando **FFmpeg** (videos) o **Pillow** (fotos) inyectando el `user_id` del cliente en baja opacidad.
3.  **Entrega**: Se sirve el contenido procesado con una URL temporal (Presigned).

---
*Última Actualización: 9 de Marzo de 2026*
