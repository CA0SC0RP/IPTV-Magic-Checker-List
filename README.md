# IPTV Magic Checker List

Herramienta completa para diagnóstico, verificación y gestión de cuentas IPTV en servidores compatibles con Xtream Codes, con modo individual, verificación masiva por lotes, inspector de streaming y lista de cuentas guardadas.

## 🚀 Características Principales

### 1. ⚡ Modo Individual (Single Checker)
- **Diagnóstico en Tiempo Real:** Conexión directa contra `player_api.php` para clasificar cuentas con precisión:
  - **Activa y Vigente:** Cuenta válida con suscripción activa.
  - **Vencida:** Fecha de expiración anterior a la actual, indicando los días exactos de vencimiento en tamaño grande.
  - **Credenciales Incorrectas (Auth Failed):** Usuario o contraseña erróneos según el servidor.
  - **Error de Conexión:** Servidor fuera de línea, puerto cerrado o tiempo de espera agotado.
  - **Datos Ausentes:** Identificación de paneles no oficiales que omiten campos requeridos (`status`, `exp_date`, `max_connections`).
  - **Estados Desconocidos:** Respuestas fuera del estándar reportadas literalmente.
- **Días Restantes Destacados:** Muestra la fecha/hora de término y el contador de días restantes en tipografía de alto impacto (`QUEDAN: 35 DÍAS`).
- **Medidor de Conexiones:** Visualización gráfica de conexiones activas vs. límite de conexiones simultáneas (`max_connections`).
- **Inspector y Reproductor de Flujo (Live Stream Probe & Player):**
  - Sondeo directo de paquetes de video MPEG-TS / HLS simulando reproductor VLC.
  - Selector de ID de canal (Stream ID) y formato (`.ts` / `.m3u8`).
  - Medición de latencia de primer byte (TTFB), tipo de contenido MIME y tasa estimada.
  - Reproductor HTML5 integrado para vista previa en pantalla y enlace para abrir en VLC.
- **Guardado Rápido:** Botón **"Salvar Cuenta"** para almacenar la cuenta diagnosticada en tu lista persistente.

### 2. 📦 Verificación Masiva por Lotes (Batch Checker)
- **Multi-Formato:** Reconoce automáticamente múltiples formatos de listas (una cuenta por línea):
  - `http://servidor:puerto usuario contraseña`
  - `servidor:puerto:usuario:contraseña`
  - `usuario:contraseña@servidor:puerto`
  - URLs M3U directas (`http://servidor:puerto/get.php?username=...&password=...`)
- **Importación y Exportación:**
  - Carga manual o importación de archivos `.txt`, `.m3u`, `.csv`.
  - Exportación de resultados a **Lista M3U (.m3u)** con solo cuentas activas, **Informe CSV** o **JSON**.
- **Control de Rendimiento:** Hilos concurrentes ajustables (1 a 10 hilos simultáneos) y timeout configurable.
- **Métricas en Vivo:** Barra de progreso interactiva con contadores por categoría de estado y filtrado rápido.

### 3. 💾 Cuentas Guardadas (Saved Accounts)
- Almacenamiento local persistente (`localStorage`).
- Cuentas **estrictamente enumeradas** (`#1`, `#2`, `#3`, ...) con la información clave:
  - **Host / Servidor** (con botón de copia).
  - **Usuario** (con botón de copia).
  - **Contraseña** (con botón de visibilidad `••••••••` y copia).
  - **Fecha y Hora de Término** junto al contador de **Días Restantes en Grande** (`QUEDAN: X DÍAS` / `ILIMITADA ∞` / `VENCIDA`).
  - **Geolocalización:** País detectado automáticamente con su bandera (ej. 🇪🇸 España, 🇲🇽 México, 🇨🇴 Colombia, 🇦🇷 Argentina, 🇺🇸 EE.UU., etc.).
  - **Zona Horaria del Servidor:** Indicador para conocer el origen horario del panel IPTV.
- Botón **"Re-comprobar"** para verificar la cuenta en vivo con un solo clic.
- Exportación de la lista guardada en formato `.txt`.

### 4. 🧪 Servidor Demo Integrado (Mock Server)
- Permite probar todas las funcionalidades inmediatamente sin necesidad de contar con credenciales reales:
  - Cuenta VIP Activa (`demo_vip`)
  - Cuenta Trial 48h (`demo_trial`)
  - Cuenta Ilimitada (`demo_unlimited`)
  - Cuenta Vencida (`demo_expired`)
  - Cuenta con Datos Ausentes (`demo_absent`)
  - Cuenta con Estado Desconocido (`demo_unknown`)
  - Servidor Inaccesible (Simulación de caída de red)

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Tipografía:** Space Grotesk / Outfit (`.font-brand`) + Plus Jakarta Sans + JetBrains Mono.
- **Backend / Proxy:** Node.js, Express, Vite middleware mode.
- **Diagnóstico:** Fetch API con simulación de cabeceras de reproductor multimedia (VLC / IPTV Smarters).

## 🔒 Privacidad y Seguridad

Cumpliendo con las directivas del proyecto, la aplicación no almacena contraseñas en servidores externos ni incluye credenciales reales en el código. Las peticiones a servidores IPTV se canalizan a través del proxy local para evitar problemas de CORS y Mixed Content en el navegador.
