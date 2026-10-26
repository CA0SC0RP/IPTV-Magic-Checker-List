import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

    // 7. Unknown Status Response
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

// Stream connectivity probe (HEAD / Range GET test)
app.post('/api/test-stream', async (req: Request, res: Response) => {
  try {
    const { streamUrl, timeoutMs = 5000 } = req.body;
    if (!streamUrl) {
      return res.status(400).json({ error: 'Se requiere la URL del stream' });
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Range': 'bytes=0-1024',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    return res.json({
      reachable: response.ok || response.status === 206 || response.status === 302,
      httpStatus: response.status,
      contentType: response.headers.get('content-type') || 'desconocido',
      latencyMs: latency,
    });
  } catch (err: any) {
    return res.json({
      reachable: false,
      error: err?.message || 'Fallo de conexión al stream',
    });
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
