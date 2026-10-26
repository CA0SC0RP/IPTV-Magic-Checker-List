import React, { useState, useEffect } from 'react';
import { CheckResult, SavedAccount } from '../types/iptv';
import { parseAccountLine } from '../utils/parser';
import { detectGeoFromTimezone } from '../utils/geo';
import { 
  Play, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Users, 
  Server, 
  Wifi, 
  Copy, 
  Check, 
  Sparkles, 
  Radio, 
  Activity,
  Layers,
  X,
  Video,
  ExternalLink,
  Info,
  BookmarkCheck,
  Dices
} from 'lucide-react';
import { RetroTvPlayer } from './RetroTvPlayer';
import { AccessGeoDiagnosticCard } from './AccessGeoDiagnosticCard';

interface SingleCheckerProps {
  onSendToBatch?: (item: { host: string; username: string; password?: string }) => void;
  onSaveAccount?: (account: SavedAccount) => void;
  isAccountAlreadySaved?: (host: string, username: string) => boolean;
  initialAccount?: { host: string; username: string; password?: string } | null;
}

export const SingleChecker: React.FC<SingleCheckerProps> = ({
  onSendToBatch,
  onSaveAccount,
  isAccountAlreadySaved,
  initialAccount,
}) => {
  const [host, setHost] = useState(initialAccount?.host || '');
  const [username, setUsername] = useState(initialAccount?.username || '');
  const [password, setPassword] = useState(initialAccount?.password || '');
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isRetroTvOpen, setIsRetroTvOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamChannelId, setStreamChannelId] = useState('1');
  const [streamFormat, setStreamFormat] = useState<'ts' | 'm3u8'>('ts');
  const [streamTesting, setStreamTesting] = useState(false);

  useEffect(() => {
    if (initialAccount) {
      setHost(initialAccount.host || '');
      setUsername(initialAccount.username || '');
      setPassword(initialAccount.password || '');
      // If initialized, trigger check automatically
      if (initialAccount.host && initialAccount.username) {
        // Will check when user is ready
      }
    }
  }, [initialAccount]);
  const [streamResult, setStreamResult] = useState<{
    reachable: boolean;
    httpStatus?: number;
    contentType?: string;
    latencyMs?: number;
    streamUrl?: string;
    serverSoftware?: string;
    bitrateEstimate?: string;
    diagnosticTitle?: string;
    diagnosticExplanation?: string;
    previewSampleUrl?: string;
    error?: string;
  } | null>(null);

  // Auto detect if user pastes full line / URL in host
  const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHost(val);

    if (val.includes('?') || val.includes('@') || val.includes('username=') || val.split(':').length >= 3) {
      const parsed = parseAccountLine(val);
      if (parsed) {
        setHost(parsed.host);
        setUsername(parsed.username);
        setPassword(parsed.password || '');
      }
    }
  };

  const loadDemo = (type: 'vip' | 'trial' | 'saturated' | 'geolocked' | 'expired' | 'banned' | 'incomplete' | 'unreachable') => {
    if (type === 'unreachable') {
      setHost('http://servidor-caido-inaccesible.xyz:9999');
      setUsername('usuario_prueba');
      setPassword('password123');
      return;
    }

    setHost('MOCK_DEMO');
    if (type === 'vip') {
      setUsername('demo_vip');
      setPassword('vip2026');
    } else if (type === 'trial') {
      setUsername('demo_trial');
      setPassword('trial123');
    } else if (type === 'saturated') {
      setUsername('demo_saturated');
      setPassword('sat333');
    } else if (type === 'geolocked') {
      setUsername('demo_geolock');
      setPassword('lock777');
    } else if (type === 'expired') {
      setUsername('demo_expired');
      setPassword('exp123');
    } else if (type === 'banned') {
      setUsername('demo_banned');
      setPassword('ban123');
    } else if (type === 'incomplete') {
      setUsername('demo_absent');
      setPassword('absent123');
    }
  };

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!host.trim() || !username.trim()) return;

    setLoading(true);
    setResult(null);
    setStreamResult(null);

    try {
      const res = await fetch('/api/check-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.trim(),
          username: username.trim(),
          password: password.trim(),
          timeoutMs,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        id: `err_${Date.now()}`,
        host,
        username,
        password,
        status: 'CONNECTION_ERROR',
        statusLabel: 'Fallo al conectar con el backend',
        statusColor: 'red',
        latencyMs: 0,
        missingFields: ['all'],
        errorDetails: err?.message || 'Error de red en la llamada API',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isSaved = result && isAccountAlreadySaved ? isAccountAlreadySaved(result.host, result.username) : false;

  const handleSave = () => {
    if (!result || !onSaveAccount) return;
    const geo = detectGeoFromTimezone(result.timezone, result.host);
    const numActive = Number(result.activeCons || 0);
    const numMax = result.maxCons !== null && result.maxCons !== undefined && result.maxCons !== '' ? Number(result.maxCons) : null;
    const isSaturated = numMax !== null && numMax > 0 && numActive >= numMax;

    const newSaved: SavedAccount = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      host: result.host,
      username: result.username,
      password: result.password,
      expDate: result.expDate,
      daysRemaining: result.daysRemaining,
      isUnlimited: result.isUnlimited,
      status: result.status,
      statusLabel: result.statusLabel,
      timezone: result.timezone,
      country: geo.country,
      flag: geo.flag,
      isSaturated,
      savedAt: new Date().toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };

    onSaveAccount(newSaved);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  const runStreamProbe = async (customId?: string, customFormat?: 'ts' | 'm3u8') => {
    if (!result || !result.host || !result.username) return;
    setStreamTesting(true);

    const channel = customId !== undefined ? customId : streamChannelId;
    const format = customFormat || streamFormat;
    const cleanHost = result.host === 'MOCK_DEMO' ? 'http://iptv-magic-demo.cloud:8080' : result.host;
    const streamUrl = `${cleanHost}/live/${encodeURIComponent(result.username)}/${encodeURIComponent(result.password || '')}/${encodeURIComponent(channel)}.${format}`;

    try {
      const res = await fetch('/api/test-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl, timeoutMs: 6000 }),
      });
      const data = await res.json();
      setStreamResult(data);
    } catch (err: any) {
      setStreamResult({
        reachable: false,
        httpStatus: 0,
        streamUrl,
        diagnosticTitle: 'Fallo de Conexión de Red',
        diagnosticExplanation: 'No se pudo conectar con el servicio local para sondear el stream.',
        error: err?.message,
      });
    } finally {
      setStreamTesting(false);
    }
  };

  const cleanHostForLinks = result?.host === 'MOCK_DEMO' ? 'http://iptv-magic-demo.cloud:8080' : result?.host || host;
  const m3uUrl = `${cleanHostForLinks}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
  const epgUrl = `${cleanHostForLinks}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Verificación Individual de Cuenta IPTV
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Verifica el estado exacto de cualquier servidor compatible con Xtream Codes. Detecta automáticamente
              cuentas activas, fechas de vencimiento, límites de conexiones simultáneas y diagnostica datos ausentes o caídas de servidor.
            </p>
          </div>
          {/* Quick Demo Fillers */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 px-1">Ejemplos:</span>
            <button
              type="button"
              onClick={() => loadDemo('vip')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
            >
              VIP Activa
            </button>
            <button
              type="button"
              onClick={() => loadDemo('saturated')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
              title="Cuenta con 3 de 3 conexiones activas (saturada)"
            >
              Saturada (3/3)
            </button>
            <button
              type="button"
              onClick={() => loadDemo('geolocked')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
              title="Cuenta con bloqueo geográfico a Francia (Cloudflare WAF / Geo-IP)"
            >
              Geo-Lock (Francia)
            </button>
            <button
              type="button"
              onClick={() => loadDemo('trial')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
            >
              Trial (48h)
            </button>
            <button
              type="button"
              onClick={() => loadDemo('expired')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
            >
              Vencida
            </button>
            <button
              type="button"
              onClick={() => loadDemo('incomplete')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors"
            >
              Datos Ausentes
            </button>
            <button
              type="button"
              onClick={() => loadDemo('unreachable')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
            >
              Error Red
            </button>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleCheck} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Host / Server Input */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Servidor / Host (o pega URL completa)</span>
                <span className="text-[11px] text-slate-500 font-normal">ej. http://servidor.xyz:8080</span>
              </label>
              <div className="relative">
                <Server className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="http://host:puerto o pega enlace M3U..."
                  value={host}
                  onChange={handleHostChange}
                  required
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-all font-mono"
                />
              </div>
            </div>

            {/* Username Input */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Usuario / Username
              </label>
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-all"
              />
            </div>

            {/* Password Input */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Contraseña / Pass
              </label>
              <input
                type="text"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 transition-all"
              />
            </div>

            {/* Timeout Selector */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Tiempo Límite</span>
              </label>
              <select
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-200 transition-all cursor-pointer"
              >
                <option value={4000}>4 segundos</option>
                <option value={8000}>8 segundos (Recomendado)</option>
                <option value={15000}>15 segundos (Red lenta)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <p className="text-xs text-slate-500">
              Tip: Puedes pegar un enlace M3U directo en el campo de servidor y se autocompletarán los datos.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setHost('');
                  setUsername('');
                  setPassword('');
                  setResult(null);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={loading || !host.trim() || !username.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Consultando Servidor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Comprobar Cuenta</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Main Status Header Card */}
          <div
            className={`border rounded-2xl p-6 relative overflow-hidden ${
              result.status === 'ACTIVE'
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : result.status === 'EXPIRED'
                ? 'bg-amber-950/30 border-amber-500/40'
                : result.status === 'AUTH_FAILED'
                ? 'bg-rose-950/30 border-rose-500/40'
                : result.status === 'CONNECTION_ERROR'
                ? 'bg-red-950/30 border-red-500/40'
                : result.status === 'DATA_ABSENT'
                ? 'bg-purple-950/30 border-purple-500/40'
                : 'bg-slate-900 border-slate-700'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    result.status === 'ACTIVE'
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                      : result.status === 'EXPIRED'
                      ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                      : result.status === 'AUTH_FAILED' || result.status === 'BANNED' || result.status === 'DISABLED'
                      ? 'bg-rose-500 text-white shadow-rose-500/20'
                      : result.status === 'CONNECTION_ERROR'
                      ? 'bg-red-600 text-white shadow-red-500/20'
                      : 'bg-purple-600 text-white shadow-purple-500/20'
                  }`}
                >
                  {result.status === 'ACTIVE' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : result.status === 'EXPIRED' ? (
                    <Clock className="w-6 h-6" />
                  ) : result.status === 'AUTH_FAILED' || result.status === 'CONNECTION_ERROR' ? (
                    <XCircle className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {result.statusLabel}
                    </h3>
                    {result.isTrial && (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full">
                        Cuenta de Prueba / Trial
                      </span>
                    )}
                    {result.isUnlimited && (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        Ilimitada / Sin Vencimiento
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-300 mt-1 font-mono">
                    <span className="text-slate-400">Host:</span> {result.host} &nbsp;•&nbsp;{' '}
                    <span className="text-slate-400">Usuario:</span> {result.username}
                  </p>

                  {result.errorDetails && (
                    <div className="mt-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl max-w-2xl">
                      <strong>Diagnóstico:</strong> {result.errorDetails}
                    </div>
                  )}
                </div>
              </div>

              {/* Ping Latency & Actions */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">Latencia RTT:</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {result.latencyMs} ms
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {onSaveAccount && (
                    <button
                      onClick={handleSave}
                      className={`flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        justSaved || isSaved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                      }`}
                      title="Guardar cuenta en tu lista personal"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>{justSaved || isSaved ? '✓ Cuenta Salvada' : 'Salvar Cuenta'}</span>
                    </button>
                  )}

                  {onSendToBatch && (
                    <button
                      onClick={() => onSendToBatch({ host: result.host, username: result.username, password: result.password })}
                      className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Verificar en Lote</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Missing Fields Banner if applicable */}
          {result.missingFields && result.missingFields.length > 0 && result.status !== 'CONNECTION_ERROR' && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 flex items-start space-x-3 text-purple-200">
              <AlertTriangle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Aviso de Datos Ausentes en la Respuesta del Servidor
                </h4>
                <p className="text-xs text-purple-200/90 mt-1">
                  El servidor compatible omitió los siguientes campos estandarizados en su respuesta:
                  <span className="font-mono text-purple-100 font-semibold ml-1">
                    [{result.missingFields.join(', ')}]
                  </span>
                  . Esto es común en paneles IPTV no oficiales o versiones modificadas de Xtream Codes.
                </p>
              </div>
            </div>
          )}

          {/* Detail Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expiration Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Fecha y Hora de Vencimiento
                  </span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  {result.expDate || 'No informado por servidor'}
                </div>
              </div>

              {/* Big Remaining Days Counter */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                {result.isUnlimited ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">VIGENCIA:</span>
                    <span className="font-brand font-black text-xl text-emerald-300 tracking-tight leading-none">
                      ILIMITADA ∞
                    </span>
                  </div>
                ) : result.daysRemaining !== null && result.daysRemaining !== undefined ? (
                  result.daysRemaining > 0 ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">QUEDAN:</span>
                      <span className="font-brand font-black text-2xl text-emerald-300 tracking-tight leading-none">
                        {result.daysRemaining} {result.daysRemaining === 1 ? 'DÍA' : 'DÍAS'}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">ESTADO:</span>
                      <span className="font-brand font-black text-lg text-rose-300 tracking-tight leading-none">
                        VENCIDA HACE {Math.abs(result.daysRemaining)} {Math.abs(result.daysRemaining) === 1 ? 'DÍA' : 'DÍAS'}
                      </span>
                    </div>
                  )
                ) : (
                  <span className="text-xs text-slate-500">Sin datos de cálculo de días</span>
                )}
              </div>
            </div>

            {/* Connection Limits */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Conexiones Simultáneas
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {result.activeCons ?? 0} / {result.maxCons ?? '∞'}
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                Máximo: {result.maxCons !== null ? `${result.maxCons} dispositivo(s)` : 'Ilimitadas / No definido'}
              </div>
              <div className="mt-2">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      Number(result.activeCons) >= Number(result.maxCons) && Number(result.maxCons) > 0
                        ? 'bg-rose-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{
                      width: result.maxCons
                        ? `${Math.min(100, (Number(result.activeCons || 0) / Number(result.maxCons)) * 100)}%`
                        : '25%',
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  En uso actualmente: <strong className="text-slate-200">{result.activeCons ?? 0}</strong> conexiones
                </p>
              </div>
            </div>

            {/* Server Environment */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Información del Servidor
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Zona horaria:</span>
                  <span className="font-mono text-slate-200">{result.timezone || 'UTC'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hora servidor:</span>
                  <span className="font-mono text-slate-200">{result.serverTime || 'No enviada'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Formatos:</span>
                  <span className="font-mono text-cyan-300">
                    {result.allowedFormats?.join(', ') || 'm3u8, ts'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico Integral de Acceso y Geolocalización (Geo-Lock & Conexiones) */}
          {result.status !== 'CONNECTION_ERROR' && (
            <AccessGeoDiagnosticCard result={result} />
          )}

          {/* Quick Links & Stream Prober for Active Accounts */}
          {result.status === 'ACTIVE' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                Enlaces de Lista y Prueba de Streaming
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* M3U Link */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block font-semibold">Lista M3U Plus (HLS/TS)</span>
                    <span className="text-xs font-mono text-slate-300 truncate block">
                      {m3uUrl}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(m3uUrl, 'm3u')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white shrink-0 transition-colors"
                    title="Copiar enlace M3U"
                  >
                    {copiedKey === 'm3u' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* EPG Link */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block font-semibold">Guía EPG (XMLTV)</span>
                    <span className="text-xs font-mono text-slate-300 truncate block">
                      {epgUrl}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(epgUrl, 'epg')}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white shrink-0 transition-colors"
                    title="Copiar enlace EPG"
                  >
                    {copiedKey === 'epg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Stream Probe Tester Section */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">
                      Test de Flujo de Video en Vivo (Stream Probe & Player)
                    </span>
                    <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      Inspección TS/HLS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Comprueba si el servidor tiene canales emitiendo en directo y si tus credenciales tienen cupo de reproducción.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRetroTvOpen(true)}
                    className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer shrink-0"
                    title="Abrir reproductor Smart TV y probar un canal aleatorio real de la cuenta"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>📺 Probar Canal Random (Smart TV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStreamModalOpen(true);
                      if (!streamResult) {
                        runStreamProbe();
                      }
                    }}
                    className="flex items-center justify-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                    <span>Inspector Manual</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* Stream Inspector & Live Player Modal                         */}
      {/* ============================================================ */}
      {isStreamModalOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold">
                  <Video className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Test de Flujo de Video (Live Stream Inspector)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sondeo directo de paquetes de video MPEG-TS / HLS y reproductor de prueba
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs text-slate-300">
              {/* Explanatory Guide Card */}
              <div className="bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>¿Qué hace este test y qué respuestas proporciona?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Realiza una conexión simulando un reproductor VLC al endpoint del canal en directo.
                  Comprueba si el transcodificador del servidor está entregando paquetes de video y si las credenciales tienen
                  conexiones simultáneas disponibles.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-0.5">🟢 HTTP 200 / 206 (Flujo Activo):</span>
                    <span>El canal transmite video normalmente y el reproductor puede reproducir la señal.</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-rose-400 font-bold block mb-0.5">🔴 HTTP 403 (Acceso Prohibido):</span>
                    <span>Límite de conexiones simultáneas alcanzado o cuenta vencida.</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-bold block mb-0.5">🟠 HTTP 404 (Canal Inexistente):</span>
                    <span>El número de canal (Stream ID) no existe en este servidor IPTV.</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-red-400 font-bold block mb-0.5">⚪ Timeout / Caída:</span>
                    <span>El servidor no responde o el transcodificador está bloqueado.</span>
                  </div>
                </div>
              </div>

              {/* Stream Parameters Configuration */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        ID de Canal / Stream ID
                      </label>
                      <input
                        type="text"
                        value={streamChannelId}
                        onChange={(e) => setStreamChannelId(e.target.value)}
                        placeholder="ej. 1, 102, 5001"
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono w-28 focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Formato
                      </label>
                      <select
                        value={streamFormat}
                        onChange={(e) => setStreamFormat(e.target.value as 'ts' | 'm3u8')}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-cyan-500"
                      >
                        <option value="ts">MPEG-TS (.ts)</option>
                        <option value="m3u8">HLS (.m3u8)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => runStreamProbe()}
                    disabled={streamTesting}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    {streamTesting ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Sondeando Servidor...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Probar Este Canal</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Probe URL preview */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    URL: {result.host === 'MOCK_DEMO' ? 'http://iptv-magic-demo.cloud:8080' : result.host}/live/{result.username}/••••••••/{streamChannelId}.{streamFormat}
                  </span>
                </div>
              </div>

              {/* Probe Result Box */}
              {streamResult && (
                <div
                  className={`p-5 rounded-2xl border space-y-4 ${
                    streamResult.reachable
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {streamResult.reachable ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {streamResult.diagnosticTitle || (streamResult.reachable ? 'Flujo de Video Activo' : 'Error en Flujo')}
                        </h4>
                        <p className="text-xs opacity-90 mt-0.5">
                          {streamResult.diagnosticExplanation}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold ${
                        streamResult.reachable
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      HTTP {streamResult.httpStatus || '0'}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Latencia TTFB</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {streamResult.latencyMs} ms
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tipo de Contenido</span>
                      <span className="font-mono text-slate-200 truncate block" title={streamResult.contentType}>
                        {streamResult.contentType || 'Desconocido'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tasa / Bitrate</span>
                      <span className="font-mono text-slate-200">
                        {streamResult.bitrateEstimate || 'Dinámico'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Software Servidor</span>
                      <span className="font-mono text-slate-200 truncate block">
                        {streamResult.serverSoftware || 'Xtream Engine'}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Video Player Preview */}
                  {streamResult.reachable && (
                    <div className="pt-3 border-t border-emerald-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                          Reproductor de Prueba en Vivo (Live Player Preview)
                        </span>

                        <button
                          onClick={() => {
                            if (streamResult.streamUrl) {
                              navigator.clipboard.writeText(streamResult.streamUrl);
                              setCopiedKey('stream_url');
                              setTimeout(() => setCopiedKey(null), 2000);
                            }
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors"
                        >
                          {copiedKey === 'stream_url' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">¡URL Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Enlace Directo</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Video Player Box */}
                      <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 relative aspect-video flex items-center justify-center">
                        <video
                          src={streamResult.previewSampleUrl || streamResult.streamUrl}
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Nota: Los streams de tipo MPEG-TS directo son nativos en VLC, Kodi o reproductores IPTV dedicados.
                        </span>
                        {streamResult.streamUrl && (
                          <a
                            href={`vlc://${streamResult.streamUrl}`}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                          >
                            <span>Abrir en VLC</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition-colors cursor-pointer"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retro Vintage TV Mini-Player */}
      {result && (
        <RetroTvPlayer
          isOpen={isRetroTvOpen}
          onClose={() => setIsRetroTvOpen(false)}
          host={result.host}
          username={result.username}
          password={result.password}
        />
      )}
    </div>
  );
};

