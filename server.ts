import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Allow requests from the Android Capacitor WebView and browser clients.
// Handle preflight requests before API routes.
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

interface CheckResult {
  id: string;
  host: string;
  username: string;
  password?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'AUTH_FAILED' | 'BANNED' | 'DISABLED' | 'CONNECTION_ERROR' | 'UNKNOWN' | 'DATA_ABSENT';
  statusLabel: string;
  statusColor: string;
  latencyMs: number;
  expDate?: string | null;
  expTimestamp?: number | null;
  daysRemaining?: number | null;
  isUnlimited?: boolean;
  isTrial?: boolean;
  activeCons?: number | string | null;
  maxCons?: number | string | null;
  allowedFormats?: string[];
  serverTime?: string | null;
  timezone?: string | null;
  serverUrl?: string | null;
  serverPort?: string | null;
  missingFields: string[];
  errorDetails?: string;
  rawSample?: any;
  checkedAt: string;
}

// Clean and normalize server host
function normalizeHost(inputHost: string): string {
  let clean = inputHost.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'http://' + clean;
  }
  // Remove trailing slashes
  return clean.replace(/\/+$/, '');
}

// Format unix timestamp or date string to readable format
function parseExpDate(expVal: any): { expDate: string | null; expTimestamp: number | null; daysRemaining: number | null; isUnlimited: boolean } {
  if (expVal === null || expVal === undefined || expVal === '' || expVal === '0') {
    return {
      expDate: 'Ilimitada (Sin expiración)',
      expTimestamp: null,
      daysRemaining: null,
      isUnlimited: true,
    };
  }

  let timestampSec: number | null = null;
  if (typeof expVal === 'number') {
    timestampSec = expVal;
  } else if (typeof expVal === 'string') {
    const parsedNum = parseInt(expVal, 10);
    if (!isNaN(parsedNum) && parsedNum > 100000000) {
      timestampSec = parsedNum;
    } else {
      const parsedDate = Date.parse(expVal);
      if (!isNaN(parsedDate)) {
        timestampSec = Math.floor(parsedDate / 1000);
      }
    }
  }

  if (!timestampSec) {
    return {
      expDate: String(expVal),
      expTimestamp: null,
      daysRemaining: null,
      isUnlimited: false,
    };
  }

  const expDateObj = new Date(timestampSec * 1000);
  const now = Date.now();
  const diffMs = expDateObj.getTime() - now;
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const formatted = expDateObj.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return {
    expDate: formatted,
    expTimestamp: timestampSec,
    daysRemaining,
    isUnlimited: false,
  };
}

// Internal check worker for a single IPTV account
async function checkIptvAccount(
  host: string,
  username: string,
  password: string,
  timeoutMs: number = 7000
): Promise<CheckResult> {
  const startTime = Date.now();
  const cleanHost = normalizeHost(host);
  const checkId = `${cleanHost}_${username}_${Date.now()}`;
  const nowIso = new Date().toISOString();

  // If pointing to localhost / mock server internally
  const targetUrl = `${cleanHost}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  const missingFields: string[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'IPTVSmartersPro/3.1.5 (Android/12; Mobile) VLC/3.0.18',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'close',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        id: checkId,
        host: cleanHost,
        username,
        password,
        status: 'CONNECTION_ERROR',
        statusLabel: `Error HTTP ${response.status}`,
        statusColor: 'red',
        latencyMs,
        missingFields: ['user_info', 'server_info'],
        errorDetails: `El servidor respondió con código HTTP ${response.status} (${response.statusText}). Compruebe que la URL y puerto sean correctos.`,
        checkedAt: nowIso,
      };
    }

    const responseText = await response.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON (could be HTML error page, Cloudflare challenge, or plaintext)
      return {
        id: checkId,
        host: cleanHost,
        username,
        password,
        status: 'UNKNOWN',
        statusLabel: 'Respuesta no estándar',
        statusColor: 'amber',
        latencyMs,
        missingFields: ['user_info'],
        errorDetails: `El servidor devolvió texto no estructurado en lugar de JSON de Xtream Codes: ${responseText.slice(0, 160)}...`,
        rawSample: responseText.slice(0, 300),
        checkedAt: nowIso,
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        id: checkId,
        host: cleanHost,
        username,
        password,
        status: 'UNKNOWN',
        statusLabel: 'Respuesta vacía o inválida',
        statusColor: 'amber',
        latencyMs,
        missingFields: ['user_info'],
        errorDetails: 'La respuesta del servidor no tiene estructura de datos válida.',
        rawSample: data,
        checkedAt: nowIso,
      };
    }

    // Inspect user_info
    const userInfo = data.user_info;
    const serverInfo = data.server_info;

    // Check for authentication failure
    if (
      (userInfo && (userInfo.auth === 0 || userInfo.status === 'Failed')) ||
      data.result === 'failed' ||
      data.status === 'failed'
    ) {
      return {
        id: checkId,
        host: cleanHost,
        username,
        password,
        status: 'AUTH_FAILED',
        statusLabel: 'Credenciales Incorrectas',
        statusColor: 'red',
        latencyMs,
        missingFields: ['valid_auth'],
        errorDetails: userInfo?.message || 'Usuario o contraseña erróneos según el servidor.',
        rawSample: data,
        checkedAt: nowIso,
      };
    }

    // If user_info is completely missing
    if (!userInfo) {
      return {
        id: checkId,
        host: cleanHost,
        username,
        password,
        status: 'DATA_ABSENT',
        statusLabel: 'Datos de Usuario Ausentes',
        statusColor: 'amber',
        latencyMs,
        missingFields: ['user_info', 'exp_date', 'max_connections', 'status'],
        errorDetails: 'El servidor respondió sin el bloque obligatorio user_info.',
        rawSample: data,
        checkedAt: nowIso,
      };
    }

    // Track missing fields in user_info as per project specifications
    if (userInfo.status === undefined || userInfo.status === null) missingFields.push('status');
    if (userInfo.exp_date === undefined) missingFields.push('exp_date');
    if (userInfo.max_connections === undefined && userInfo.max_cons === undefined) missingFields.push('max_connections');
    if (userInfo.active_cons === undefined && userInfo.active_connections === undefined) missingFields.push('active_cons');
    if (!serverInfo) missingFields.push('server_info');

    // Parse Expiry
    const { expDate, expTimestamp, daysRemaining, isUnlimited } = parseExpDate(userInfo.exp_date);

    // Determine status
    let finalStatus: CheckResult['status'] = 'UNKNOWN';
    let statusLabel = 'Desconocido';
    let statusColor = 'gray';

    const rawStatus = (userInfo.status || '').toString().toLowerCase();

    if (rawStatus === 'active') {
      if (expTimestamp !== null && expTimestamp * 1000 < Date.now()) {
        finalStatus = 'EXPIRED';
        statusLabel = 'Cuenta Vencida';
        statusColor = 'amber';
      } else {
        finalStatus = 'ACTIVE';
        statusLabel = 'Activa y Vigente';
        statusColor = 'emerald';
      }
    } else if (rawStatus === 'banned') {
      finalStatus = 'BANNED';
      statusLabel = 'Cuenta Baneada';
      statusColor = 'rose';
    } else if (rawStatus === 'disabled') {
      finalStatus = 'DISABLED';
      statusLabel = 'Cuenta Desactivada';
      statusColor = 'rose';
    } else if (rawStatus === 'expired') {
      finalStatus = 'EXPIRED';
      statusLabel = 'Cuenta Expirada';
      statusColor = 'amber';
    } else if (!rawStatus && missingFields.includes('status')) {
      finalStatus = 'DATA_ABSENT';
      statusLabel = 'Estado Ausente';
      statusColor = 'purple';
    } else {
      finalStatus = 'UNKNOWN';
      statusLabel = `Estado No Reconocido (${userInfo.status})`;
      statusColor = 'amber';
    }

    return {
      id: checkId,
      host: cleanHost,
      username,
      password,
      status: finalStatus,
      statusLabel,
      statusColor,
      latencyMs,
      expDate,
      expTimestamp,
      daysRemaining,
      isUnlimited,
      isTrial: userInfo.is_trial === '1' || userInfo.is_trial === 1,
      activeCons: userInfo.active_cons ?? userInfo.active_connections ?? null,
      maxCons: userInfo.max_connections ?? userInfo.max_cons ?? null,
      allowedFormats: userInfo.allowed_output_formats || ['m3u8', 'ts'],
      serverTime: serverInfo?.time_now || null,
      timezone: serverInfo?.timezone || null,
      serverUrl: serverInfo?.url || cleanHost,
      serverPort: serverInfo?.port || null,
      missingFields,
      rawSample: data,
      checkedAt: nowIso,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    let errorDetails = err?.message || 'Error desconocido';

    if (err?.name === 'AbortError') {
      errorDetails = `Tiempo de espera agotado (Timeout >${timeoutMs}ms). El servidor no responde.`;
    } else if (err?.code === 'ECONNREFUSED') {
      errorDetails = `Conexión rechazada por el servidor (${cleanHost}). Puerto cerrado o servidor fuera de línea.`;
    } else if (err?.code === 'ENOTFOUND') {
      errorDetails = `Dominio o dirección no encontrada (${cleanHost}). Verifique el DNS.`;
    }

    return {
      id: checkId,
      host: cleanHost,
      username,
      password,
      status: 'CONNECTION_ERROR',
      statusLabel: 'Error de Conexión',
      statusColor: 'red',
      latencyMs,
      missingFields: ['all'],
      errorDetails,
      checkedAt: nowIso,
    };
  }
}

// -------------------------------------------------------------
// Built-in Mock IPTV Server (Allows testing with zero setup!)
// -------------------------------------------------------------
app.get('/api/mock-demo/player_api.php', (req: Request, res: Response) => {
  const { username, password } = req.query;

  // Simulate network latency (80ms - 250ms)
  const delay = Math.floor(Math.random() * 150) + 70;

  setTimeout(() => {
    // 1. VIP Active Account
    if (username === 'demo_vip' && password === 'vip2026') {
      return res.json({
        user_info: {
          username: 'demo_vip',
          password: '••••••••',
          message: 'Bienvenido VIP',
          auth: 1,
          status: 'Active',
          exp_date: '1798761600', // 2027
          is_trial: '0',
          active_cons: '0',
          max_connections: '2',
          created_at: '1704067200',
          allowed_output_formats: ['m3u8', 'ts', 'rtmp'],
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'Europe/Madrid',
        },
      });
    }

    // 2. Trial Account
    if (username === 'demo_trial' && password === 'trial123') {
      const expInTwoDays = Math.floor((Date.now() + 48 * 3600 * 1000) / 1000);
      return res.json({
        user_info: {
          username: 'demo_trial',
          password: '••••••••',
          auth: 1,
          status: 'Active',
          exp_date: String(expInTwoDays),
          is_trial: '1',
          active_cons: '1',
          max_connections: '1',
          created_at: String(Math.floor(Date.now() / 1000)),
          allowed_output_formats: ['m3u8', 'ts'],
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'UTC',
        },
      });
    }

    // 3. Unlimited Account (No Expiry Date)
    if (username === 'demo_unlimited' && password === 'unlimited77') {
      return res.json({
        user_info: {
          username: 'demo_unlimited',
          password: '••••••••',
          auth: 1,
          status: 'Active',
          exp_date: null,
          is_trial: '0',
          active_cons: '0',
          max_connections: '5',
          allowed_output_formats: ['m3u8', 'ts'],
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'America/New_York',
        },
      });
    }

    // 4. Expired Account
    if (username === 'demo_expired' && password === 'exp123') {
      return res.json({
        user_info: {
          username: 'demo_expired',
          password: '••••••••',
          auth: 1,
          status: 'Active',
          exp_date: '1672531199', // 2022
          is_trial: '0',
          active_cons: '0',
          max_connections: '1',
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'UTC',
        },
      });
    }

    // 5. Banned Account
    if (username === 'demo_banned' && password === 'ban123') {
      return res.json({
        user_info: {
          username: 'demo_banned',
          auth: 1,
          status: 'Banned',
          exp_date: '1798761600',
          is_trial: '0',
          active_cons: '0',
          max_connections: '1',
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
        },
      });
    }

    // 6. Incomplete / Data Absent Account
    if (username === 'demo_absent' && password === 'absent123') {
      return res.json({
        user_info: {
          username: 'demo_absent',
          auth: 1,
          // Missing status, missing exp_date, missing max_connections
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
        },
      });
    }

    // 7. Saturated Account (3/3 Connections Active)
    if (username === 'demo_saturated' && password === 'sat333') {
      return res.json({
        user_info: {
          username: 'demo_saturated',
          password: '••••••••',
          auth: 1,
          status: 'Active',
          exp_date: '1798761600',
          is_trial: '0',
          active_cons: '3',
          max_connections: '3',
          allowed_output_formats: ['m3u8', 'ts'],
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'Europe/Madrid',
        },
      });
    }

    // 8. Geo-Locked Account (France - Locked by GeoIP / WAF)
    if (username === 'demo_geolock' && password === 'lock777') {
      return res.json({
        user_info: {
          username: 'demo_geolock',
          password: '••••••••',
          auth: 1,
          status: 'Active',
          exp_date: '1798761600',
          is_trial: '0',
          active_cons: '0',
          max_connections: '2',
          allowed_output_formats: ['m3u8', 'ts'],
        },
        server_info: {
          url: 'iptv-magic-demo.cloud',
          port: '8080',
          server_protocol: 'http',
          time_now: '2026-10-26 21:50:00',
          timezone: 'Europe/Paris',
        },
      });
    }

    // 9. Unknown Status Response
    if (username === 'demo_unknown' && password === 'unk123') {
      return res.json({
        user_info: {
          username: 'demo_unknown',
          auth: 1,
          status: 'PendingReview_Quarantine',
          exp_date: '1798761600',
        },
      });
    }

    // Default: Authentication failed
    return res.json({
      user_info: {
        auth: 0,
        status: 'Failed',
        message: 'Credenciales inválidas o usuario inexistente',
      },
    });
  }, delay);
});

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Single Account Check
app.post('/api/check-account', async (req: Request, res: Response) => {
  try {
    const { host, username, password, timeoutMs } = req.body;

    if (!host || !username) {
      return res.status(400).json({ error: 'Se requieren el servidor y el nombre de usuario' });
    }

    // Check if host is internal mock
    let resolvedHost = host;
    if (host === 'MOCK_DEMO' || host.includes('iptv-magic-demo')) {
      resolvedHost = `http://127.0.0.1:${PORT}/api/mock-demo`;
    }

    const result = await checkIptvAccount(
      resolvedHost,
      username,
      password || '',
      timeoutMs ? parseInt(timeoutMs, 10) : 8000
    );

    // If it was mock demo, display clean demo host
    if (host === 'MOCK_DEMO' || host.includes('iptv-magic-demo')) {
      result.host = 'http://iptv-magic-demo.cloud:8080';
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error interno al consultar el servidor' });
  }
});

// Batch Check Accounts (with concurrency control)
app.post('/api/batch-check', async (req: Request, res: Response) => {
  try {
    const { accounts, concurrency = 3, timeoutMs = 7000 } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: 'La lista de cuentas no puede estar vacía' });
    }

    const maxLimit = 250;
    const itemsToCheck = accounts.slice(0, maxLimit);
    const results: CheckResult[] = [];
    const queue = [...itemsToCheck];

    // Simple worker pool
    const poolLimit = Math.min(Math.max(1, concurrency), 10);
    const workers = Array.from({ length: poolLimit }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        let resolvedHost = item.host;
        if (item.host === 'MOCK_DEMO' || item.host?.includes('iptv-magic-demo')) {
          resolvedHost = `http://127.0.0.1:${PORT}/api/mock-demo`;
        }

        const resItem = await checkIptvAccount(
          resolvedHost,
          item.username,
          item.password || '',
          timeoutMs
        );

        if (item.host === 'MOCK_DEMO' || item.host?.includes('iptv-magic-demo')) {
          resItem.host = 'http://iptv-magic-demo.cloud:8080';
        }

        results.push(resItem);
      }
    });

    await Promise.all(workers);

    return res.json({
      total: itemsToCheck.length,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error en verificación por lotes' });
  }
});

// Mock video stream route for demo accounts
app.get('/api/mock-demo/sample-video.mp4', (_req: Request, res: Response) => {
  // A tiny valid 1-second blank MP4 container
  const base64Mp4 = 'AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAAmG1kYXQAAAAAAAABAAAA' +
    'AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//' +
    'AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//' +
    'AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//AAAAAP//';
  const buffer = Buffer.from(base64Mp4, 'base64');
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Accept-Ranges', 'bytes');
  res.send(buffer);
});

// Demo channels list for random testing
const DEMO_CHANNELS = [
  { stream_id: 101, name: 'ESPN Deportes HD', category_name: 'Deportes' },
  { stream_id: 102, name: 'Fox Sports 1 HD', category_name: 'Deportes' },
  { stream_id: 201, name: 'HBO Latino HD', category_name: 'Cine y Series' },
  { stream_id: 202, name: 'Warner Channel HD', category_name: 'Entretenimiento' },
  { stream_id: 301, name: 'Discovery Channel HD', category_name: 'Documentales' },
  { stream_id: 302, name: 'National Geographic HD', category_name: 'Documentales' },
  { stream_id: 401, name: 'Cartoon Network', category_name: 'Infantil' },
  { stream_id: 501, name: 'CNN en Español', category_name: 'Noticias' },
  { stream_id: 601, name: 'Canal de las Estrellas HD', category_name: 'Nacionales' },
];

// Endpoint: Fetch real or demo random channel
app.post('/api/get-random-channel', async (req: Request, res: Response) => {
  try {
    const { host, username, password } = req.body;
    if (!host || !username) {
      return res.status(400).json({ success: false, error: 'Se requieren el servidor y el usuario' });
    }

    const cleanHost = normalizeHost(host);

    // Mock Demo check
    if (host === 'MOCK_DEMO' || cleanHost.includes('iptv-magic-demo') || cleanHost.includes('127.0.0.1')) {
      const randomItem = DEMO_CHANNELS[Math.floor(Math.random() * DEMO_CHANNELS.length)];
      return res.json({
        success: true,
        streamId: randomItem.stream_id,
        name: randomItem.name,
        category: randomItem.category_name,
        totalChannels: DEMO_CHANNELS.length,
        streamUrl: `http://iptv-magic-demo.cloud:8080/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${randomItem.stream_id}.ts`,
        previewVideoUrl: `http://127.0.0.1:${PORT}/api/mock-demo/sample-video.mp4`,
      });
    }

    // Real IPTV Server: request player_api.php?username=...&password=...&action=get_live_streams
    const targetUrl = `${cleanHost}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}&action=get_live_streams`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'IPTVSmartersPro/3.1.5 (Android/12; Mobile) VLC/3.0.18',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.json({
        success: false,
        error: `El servidor respondió con código HTTP ${response.status}`,
      });
    }

    const channelsData = await response.json();

    if (!Array.isArray(channelsData) || channelsData.length === 0) {
      return res.json({
        success: false,
        error: 'No se encontraron canales en la lista del servidor para esta cuenta.',
      });
    }

    // Pick a random channel from list
    const randomIndex = Math.floor(Math.random() * channelsData.length);
    const selected = channelsData[randomIndex];
    const streamId = selected.stream_id || selected.id || selected.num;

    return res.json({
      success: true,
      streamId,
      name: selected.name || `Canal ${streamId}`,
      category: selected.category_name || selected.category_id || 'General',
      icon: selected.stream_icon || null,
      totalChannels: channelsData.length,
      streamUrl: `${cleanHost}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${streamId}.ts`,
      streamHlsUrl: `${cleanHost}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${streamId}.m3u8`,
    });
  } catch (err: any) {
    return res.json({
      success: false,
      error: err?.message || 'Error al obtener la lista de canales del servidor',
    });
  }
});

// Stream connectivity probe (HEAD / Range GET test)
app.post('/api/test-stream', async (req: Request, res: Response) => {
  try {
    const { streamUrl, timeoutMs = 6000 } = req.body;
    if (!streamUrl) {
      return res.status(400).json({ error: 'Se requiere la URL del stream' });
    }

    const startTime = Date.now();

    // Check if it's the internal demo mock server
    if (streamUrl.includes('iptv-magic-demo') || streamUrl.includes('MOCK_DEMO')) {
      const isExpired = streamUrl.includes('demo_expired');
      const isBanned = streamUrl.includes('demo_banned');
      const isBadUser = streamUrl.includes('demo_baduser');
      const isSaturated = streamUrl.includes('demo_saturated');
      const isGeoLocked = streamUrl.includes('demo_geolock');

      if (isSaturated) {
        return res.json({
          reachable: false,
          httpStatus: 403,
          contentType: 'text/html',
          latencyMs: 78,
          streamUrl,
          diagnosticTitle: 'Límite de Conexiones Simultáneas Alcanzado (3/3)',
          diagnosticExplanation: 'Todas las conexiones permitidas (3/3) están ocupadas. El servidor Xtream rechaza la transmisión de nuevos canales hasta que se desconecte una pantalla.',
        });
      }

      if (isGeoLocked) {
        return res.json({
          reachable: false,
          httpStatus: 403,
          contentType: 'text/html; charset=UTF-8',
          latencyMs: 145,
          streamUrl,
          serverSoftware: 'cloudflare-waf',
          diagnosticTitle: 'Bloqueo Geográfico / Geo-Lock (HTTP 403 Forbidden)',
          diagnosticExplanation: 'El cortafuegos del servidor (Cloudflare WAF / Geo-IP) bloqueó la conexión. La transmisión de video está restringida a direcciones IP de Francia.',
        });
      }

      if (isExpired || isBanned || isBadUser) {
        return res.json({
          reachable: false,
          httpStatus: 403,
          contentType: 'text/html',
          latencyMs: 95,
          streamUrl,
          diagnosticTitle: 'Acceso Denegado al Stream (HTTP 403)',
          diagnosticExplanation: isExpired
            ? 'La cuenta ha caducado. El servidor rechaza la conexión de streaming.'
            : isBanned
            ? 'La cuenta está baneada por el administrador del panel.'
            : 'Credenciales inválidas para abrir el canal.',
        });
      }

      return res.json({
        reachable: true,
        httpStatus: 200,
        contentType: 'video/mp2t (MPEG-TS Live Video)',
        latencyMs: 82,
        streamUrl,
        bitrateEstimate: '4500 kbps (1080p60)',
        serverSoftware: 'Xtream-Codes Pro / 2.9.3 (Demo)',
        diagnosticTitle: 'Flujo de Video Activo y Transmitiendo',
        diagnosticExplanation: 'El servidor respondió exitosamente con paquetes de video MPEG-TS. La cuenta tiene permisos de reproducción activos y conexiones disponibles.',
        previewSampleUrl: `http://127.0.0.1:${PORT}/api/mock-demo/sample-video.mp4`,
      });
    }

    // Real IPTV Server probe
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18 (Linux; Android 12)',
        'Range': 'bytes=0-4096',
        'Accept': '*/*',
        'Connection': 'close',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const serverHeader = response.headers.get('server') || 'IPTV Stream Server';

    let diagnosticTitle = 'Respuesta del Stream';
    let diagnosticExplanation = '';
    const isReachable = response.ok || response.status === 206 || response.status === 302;

    if (response.status === 200 || response.status === 206) {
      diagnosticTitle = 'Flujo de Video Activo (HTTP ' + response.status + ')';
      diagnosticExplanation = 'El canal está transmitiendo paquetes multimedia en vivo correctamente. Las credenciales tienen autorización y hay cupo de conexión.';
    } else if (response.status === 401 || response.status === 403) {
      diagnosticTitle = 'Acceso Prohibido (HTTP ' + response.status + ')';
      diagnosticExplanation = 'El servidor rechazó la reproducción. Posibles causas: límite de conexiones simultáneas alcanzado, bloqueo geográfico por país o canal fuera del paquete.';
    } else if (response.status === 404) {
      diagnosticTitle = 'Canal No Encontrado (HTTP 404)';
      diagnosticExplanation = 'El identificador del canal (Stream ID) no existe en este servidor IPTV. Pruebe con otro ID de canal o descargue la lista M3U completa para ver los canales válidos.';
    } else if (response.status === 500 || response.status === 502 || response.status === 503) {
      diagnosticTitle = 'Error de Servidor / Transcodificador (HTTP ' + response.status + ')';
      diagnosticExplanation = 'El servidor IPTV está en línea pero el transcodificador del canal falló o está saturado temporalmente.';
    } else {
      diagnosticTitle = `Código HTTP ${response.status}`;
      diagnosticExplanation = `El servidor respondió con código ${response.status} (${response.statusText}).`;
    }

    return res.json({
      reachable: isReachable,
      httpStatus: response.status,
      contentType,
      latencyMs: latency,
      streamUrl,
      serverSoftware: serverHeader,
      diagnosticTitle,
      diagnosticExplanation,
    });
  } catch (err: any) {
    let explanation = err?.message || 'Error de conexión desconocido';
    if (err?.name === 'AbortError') {
      explanation = 'Tiempo de espera agotado (>6s). El servidor no envió ningún paquete de video inicial.';
    } else if (err?.code === 'ECONNREFUSED') {
      explanation = 'El puerto de streaming del servidor está cerrado o bloqueado por firewall.';
    }

    return res.json({
      reachable: false,
      httpStatus: 0,
      contentType: 'none',
      latencyMs: 0,
      streamUrl: req.body.streamUrl,
      diagnosticTitle: 'Fallo de Conexión al Flujo',
      diagnosticExplanation: explanation,
      error: explanation,
    });
  }
});

// -------------------------------------------------------------
// Endpoint: Comprehensive Access, Geo-Lock & Connection Saturation Diagnostic
// -------------------------------------------------------------
app.post('/api/diagnose-access', async (req: Request, res: Response) => {
  try {
    const { host, username, password, activeCons, maxCons, timezone } = req.body;

    if (!host || !username) {
      return res.status(400).json({ error: 'Se requieren el servidor y el usuario' });
    }

    const cleanHost = normalizeHost(host);
    const numActive = Number(activeCons || 0);
    const numMax = maxCons !== null && maxCons !== undefined && maxCons !== '' ? Number(maxCons) : null;
    const isSaturated = numMax !== null && numMax > 0 && numActive >= numMax;

    // Detect Country & Region heuristic from timezone and host
    const tzLower = (timezone || '').toLowerCase();
    const hostLower = host.toLowerCase();

    let country = 'Internacional';
    let flag = '🌐';
    let region = 'Global';

    if (hostLower.includes('.es') || tzLower.includes('madrid') || tzLower.includes('canary')) {
      country = 'España'; flag = '🇪🇸'; region = 'Europa';
    } else if (hostLower.includes('.mx') || tzLower.includes('mexico') || tzLower.includes('monterrey') || tzLower.includes('cancun')) {
      country = 'México'; flag = '🇲🇽'; region = 'Norteamérica / Latam';
    } else if (hostLower.includes('.co') || tzLower.includes('bogota')) {
      country = 'Colombia'; flag = '🇨🇴'; region = 'Latinoamérica';
    } else if (hostLower.includes('.ar') || tzLower.includes('buenos_aires') || tzLower.includes('argentina')) {
      country = 'Argentina'; flag = '🇦🇷'; region = 'Latinoamérica';
    } else if (hostLower.includes('.cl') || tzLower.includes('santiago')) {
      country = 'Chile'; flag = '🇨🇱'; region = 'Latinoamérica';
    } else if (hostLower.includes('.pe') || tzLower.includes('lima')) {
      country = 'Perú'; flag = '🇵🇪'; region = 'Latinoamérica';
    } else if (hostLower.includes('.fr') || tzLower.includes('paris')) {
      country = 'Francia'; flag = '🇫🇷'; region = 'Europa';
    } else if (hostLower.includes('.us') || tzLower.includes('new_york') || tzLower.includes('los_angeles') || tzLower.includes('chicago') || tzLower.includes('miami')) {
      country = 'Estados Unidos'; flag = '🇺🇸'; region = 'Norteamérica';
    } else if (hostLower.includes('.uk') || tzLower.includes('london')) {
      country = 'Reino Unido'; flag = '🇬🇧'; region = 'Europa';
    } else if (tzLower.includes('utc') || tzLower.includes('gmt')) {
      country = 'Servidor Cloud (UTC)'; flag = '🌐'; region = 'Internacional';
    } else if (timezone && timezone.includes('/')) {
      const parts = timezone.split('/');
      country = parts[1]?.replace(/_/g, ' ') || parts[0];
      flag = '📍';
      region = parts[0];
    }

    // Connection state
    let connectionState: 'AVAILABLE' | 'SATURATED' | 'UNLIMITED' = 'AVAILABLE';
    let connectionsSummary = '';

    if (numMax === null) {
      connectionState = 'UNLIMITED';
      connectionsSummary = `Conexiones ilimitadas permitidas. Actualmente hay ${numActive} conexión(es) activa(s).`;
    } else if (isSaturated) {
      connectionState = 'SATURATED';
      connectionsSummary = `Línea Saturada: ${numActive} de ${numMax} conexiones permitidas en uso simultáneo. Todas las pantallas autorizadas están ocupadas.`;
    } else {
      connectionState = 'AVAILABLE';
      const freeSlots = numMax - numActive;
      connectionsSummary = `Cupo Disponible: ${numActive} de ${numMax} conexiones en uso (${freeSlots} ranura${freeSlots === 1 ? '' : 's'} libre${freeSlots === 1 ? '' : 's'} para reproducir video).`;
    }

    // Check Mock Demo accounts
    if (host === 'MOCK_DEMO' || cleanHost.includes('iptv-magic-demo') || cleanHost.includes('127.0.0.1')) {
      if (username === 'demo_saturated') {
        return res.json({
          geoLockStatus: 'SATURATED_BLOCKED',
          geoLockLabel: 'Bloqueo por Cupo de Conexiones Lleno (3/3)',
          geoLockColor: 'rose',
          country: 'España',
          flag: '🇪🇸',
          region: 'Europa',
          timezone: timezone || 'Europe/Madrid',
          connectionState: 'SATURATED',
          activeCons: 3,
          maxCons: 3,
          isSaturated: true,
          connectionsSummary: 'Línea Saturada: 3 de 3 conexiones activas en este momento.',
          geoExplanation: 'El servidor Xtream Codes bloquea de inmediato nuevas conexiones de streaming porque se alcanzó el cupo máximo contratado (3/3). Ningún reproductor podrá sintonizar canales hasta que se desconecte una pantalla.',
          wafDetected: false,
          testedStreamId: 101,
          testedFormat: 'ts',
          latencyMs: 78,
          httpStatus: 403,
          recommendations: [
            'Desconecta al menos un dispositivo activo (TV, smartphone o PC) para liberar una ranura.',
            'Verifica con tu proveedor la ampliación a un plan multi-pantalla si requieres más conexiones.',
            'No compartas tus credenciales de lista si tu suscripción tiene cupos limitados.',
          ],
        });
      }

      if (username === 'demo_geolock') {
        return res.json({
          geoLockStatus: 'GEO_RESTRICTED',
          geoLockLabel: 'Geo-Restringida / Bloqueada por País (Geo-Lock Activo)',
          geoLockColor: 'amber',
          country: 'Francia',
          flag: '🇫🇷',
          region: 'Europa',
          timezone: timezone || 'Europe/Paris',
          connectionState: 'AVAILABLE',
          activeCons: 0,
          maxCons: 2,
          isSaturated: false,
          connectionsSummary: 'Cupo Disponible: 0 de 2 conexiones en uso.',
          geoExplanation: 'El servidor autenticó la cuenta con éxito, pero la entrega de streams está restringida geográficamente a direcciones IP de Francia. Las solicitudes internacionales son bloqueadas por Cloudflare WAF / Geo-IP con código HTTP 403.',
          wafDetected: true,
          testedStreamId: 101,
          testedFormat: 'ts',
          latencyMs: 142,
          httpStatus: 403,
          recommendations: [
            'Conéctate a una VPN con nodo en Francia antes de abrir la lista o probar canales.',
            'Contacta al administrador del servicio para solicitar habilitación de acceso "Global / Worldwide".',
            'Comprueba si tu reproductor IPTV (TiviMate, Smarters Pro) soporta proxy HTTP.',
          ],
        });
      }

      // Default Demo (VIP Open World)
      return res.json({
        geoLockStatus: 'OPEN_WORLD',
        geoLockLabel: 'Lista Abierta Mundialmente (Global / Sin Geo-Bloqueo)',
        geoLockColor: 'emerald',
        country: country || 'España',
        flag: flag || '🇪🇸',
        region: region || 'Europa',
        timezone: timezone || 'Europe/Madrid',
        connectionState: isSaturated ? 'SATURATED' : 'AVAILABLE',
        activeCons: numActive,
        maxCons: numMax,
        isSaturated,
        connectionsSummary,
        geoExplanation: 'El servidor entrega paquetes de video MPEG-TS sin restricciones geográficas de IP ni cortafuegos de país. Puede reproducirse desde cualquier país del mundo sin requerir VPN ni IP dedicada.',
        wafDetected: false,
        testedStreamId: 101,
        testedFormat: 'ts',
        latencyMs: 82,
        httpStatus: 200,
        recommendations: [
          'La lista es totalmente compatible con reproductores de cualquier país sin necesidad de VPN.',
          'Puedes importar directamente el enlace M3U en Smart TV, VLC o Kodi.',
          'Conserva el cupo de conexiones simultáneas dentro del límite permitido para evitar cortes.',
        ],
      });
    }

    // Real IPTV Server: Probe random channel or stream ID 1
    let testedStreamId: string | number = 1;
    let streamProbeUrl = `${cleanHost}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/1.ts`;

    try {
      // First attempt to get one real channel ID if possible
      const listController = new AbortController();
      const listTimeout = setTimeout(() => listController.abort(), 4000);
      const listRes = await fetch(
        `${cleanHost}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password || '')}&action=get_live_streams`,
        {
          headers: { 'User-Agent': 'IPTVSmartersPro/3.1.5 VLC/3.0.18' },
          signal: listController.signal,
        }
      );
      clearTimeout(listTimeout);

      if (listRes.ok) {
        const channels = await listRes.json();
        if (Array.isArray(channels) && channels.length > 0) {
          const firstChan = channels[0];
          testedStreamId = firstChan.stream_id || firstChan.id || 1;
          streamProbeUrl = `${cleanHost}/live/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${testedStreamId}.ts`;
        }
      }
    } catch {
      // Fallback to stream 1
    }

    // Now probe the stream URL
    const probeStartTime = Date.now();
    const probeController = new AbortController();
    const probeTimeout = setTimeout(() => probeController.abort(), 6000);

    let probeStatus = 0;
    let probeContentType = '';
    let isWaf = false;
    let probeSuccess = false;

    try {
      const probeRes = await fetch(streamProbeUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18 (Linux; Android 12)',
          'Range': 'bytes=0-2048',
          'Accept': '*/*',
        },
        signal: probeController.signal,
      });

      clearTimeout(probeTimeout);
      probeStatus = probeRes.status;
      probeContentType = probeRes.headers.get('content-type') || '';
      const serverHeader = (probeRes.headers.get('server') || '').toLowerCase();
      const cfRay = probeRes.headers.get('cf-ray');

      if (serverHeader.includes('cloudflare') || cfRay || probeRes.headers.get('cf-mitigated')) {
        isWaf = true;
      }

      if (probeRes.ok || probeRes.status === 206 || probeRes.status === 302) {
        probeSuccess = true;
      }
    } catch (probeErr: any) {
      clearTimeout(probeTimeout);
      probeStatus = 0;
    }

    const latencyMs = Date.now() - probeStartTime;

    // Evaluate final Geo-Lock and Access verdict
    let geoLockStatus: 'OPEN_WORLD' | 'GEO_RESTRICTED' | 'SATURATED_BLOCKED' | 'UNKNOWN' | 'OFFLINE' = 'UNKNOWN';
    let geoLockLabel = 'Estado de Acceso No Determinado';
    let geoLockColor: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' = 'amber';
    let geoExplanation = '';
    const recommendations: string[] = [];

    if (probeSuccess) {
      geoLockStatus = 'OPEN_WORLD';
      geoLockLabel = 'Lista Abierta Mundialmente (Global / Sin Geo-Bloqueo)';
      geoLockColor = 'emerald';
      geoExplanation = `El servidor entregó paquetes de video multimedia en vivo (${probeContentType || 'video/mp2t'}) sin filtros geográficos ni bloqueos de país. La señal puede sintonizarse desde cualquier ubicación geográfica.`;
      recommendations.push('Esta lista no requiere VPN para reproducir canales.');
      recommendations.push('Funciona de forma directa en Smart TV, VLC, TiviMate y Kodi.');
      if (isSaturated) {
        recommendations.push(`Nota: Aunque el streaming está abierto, tu cuenta tiene ${numActive} de ${numMax} conexiones activas.`);
      }
    } else if (isSaturated && (probeStatus === 401 || probeStatus === 403 || probeStatus === 0)) {
      geoLockStatus = 'SATURATED_BLOCKED';
      geoLockLabel = `Bloqueo por Cupo de Conexiones Lleno (${numActive}/${numMax})`;
      geoLockColor = 'rose';
      geoExplanation = `El servidor denegó la transmisión de video (HTTP ${probeStatus || 'Drop'}) debido a que las ${numMax} conexiones permitidas están ocupadas por otros dispositivos en este instante. No se puede comprobar la apertura de país hasta que haya una ranura libre.`;
      recommendations.push(`Desconecta al menos uno de los ${numActive} dispositivos activos para liberar espacio.`);
      recommendations.push('Una vez liberada una conexión, vuelve a probar para verificar si la señal se transmite.');
      recommendations.push('Revisa quién más tiene acceso a tu usuario y contraseña de IPTV.');
    } else if (probeStatus === 403 || probeStatus === 451 || isWaf) {
      geoLockStatus = 'GEO_RESTRICTED';
      geoLockLabel = `Geo-Restringida / Bloqueada por País (${country})`;
      geoLockColor = 'amber';
      geoExplanation = `El servidor autenticó la cuenta pero rechazó la solicitud de video con código HTTP ${probeStatus} (Firewall / Cloudflare WAF detectado). Los proveedores aplican esta regla para restringir el ancho de banda exclusivamente a usuarios con IP local de ${country}.`;
      recommendations.push(`Conéctate a una VPN con servidor en ${country} antes de abrir los enlaces.`);
      recommendations.push(`Verifica si tu proveedor ofrece listas "Globales / Sin Bloqueo de ISP".`);
      recommendations.push('Prueba usando formato HLS (.m3u8) en lugar de MPEG-TS (.ts) en tu reproductor.');
    } else if (probeStatus === 0) {
      geoLockStatus = 'OFFLINE';
      geoLockLabel = 'Puerto de Streaming Sin Respuesta (Timeout / Caída)';
      geoLockColor = 'rose';
      geoExplanation = 'El servidor API respondió a la autenticación, pero el puerto de entrega de canales no respondió en 6 segundos. El transcodificador podría estar temporalmente fuera de línea.';
      recommendations.push('Verifica si el puerto del host está abierto o si el servidor está en mantenimiento.');
      recommendations.push('Comprueba si el servidor requiere HTTPS o un puerto específico.');
    } else {
      geoLockStatus = 'UNKNOWN';
      geoLockLabel = `Respuesta HTTP ${probeStatus}`;
      geoLockColor = 'blue';
      geoExplanation = `El servidor respondió con código HTTP ${probeStatus} al solicitar el canal de prueba.`;
      recommendations.push('Prueba con otro canal en la opción "Probar Canal Random (Smart TV)".');
    }

    return res.json({
      geoLockStatus,
      geoLockLabel,
      geoLockColor,
      country,
      flag,
      region,
      timezone: timezone || 'UTC',
      connectionState,
      activeCons: numActive,
      maxCons: numMax,
      isSaturated,
      connectionsSummary,
      geoExplanation,
      wafDetected: isWaf,
      testedStreamId,
      testedFormat: 'ts',
      latencyMs,
      httpStatus: probeStatus,
      recommendations,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Error al diagnosticar acceso y geolocalización' });
  }
});


// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'IPTV Magic Checker Backend', version: '1.0.0' });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[IPTV Magic Checker] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
