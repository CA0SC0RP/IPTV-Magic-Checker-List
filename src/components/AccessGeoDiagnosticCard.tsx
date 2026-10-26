import { API_BASE_URL } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { AccessDiagnosis, CheckResult } from '../types/iptv';
import { detectGeoFromTimezone } from '../utils/geo';
import { 
  Globe2, 
  ShieldAlert, 
  Users, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2, 
  Wifi, 
  Tv, 
  HelpCircle,
  Radio,
  Lock,
  Unlock
} from 'lucide-react';

interface AccessGeoDiagnosticCardProps {
  result: CheckResult;
}

export const AccessGeoDiagnosticCard: React.FC<AccessGeoDiagnosticCardProps> = ({ result }) => {
  const [diagnosis, setDiagnosis] = useState<AccessDiagnosis | null>(null);
  const [loading, setLoading] = useState(false);

  // Compute local fallback geo info immediately so user never sees blank
  const localGeo = detectGeoFromTimezone(result.timezone, result.host);
  const numActive = Number(result.activeCons || 0);
  const numMax = result.maxCons !== null && result.maxCons !== undefined && result.maxCons !== '' ? Number(result.maxCons) : null;
  const isSaturated = numMax !== null && numMax > 0 && numActive >= numMax;

  const runDiagnostic = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/diagnose-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: result.host,
          username: result.username,
          password: result.password || '',
          activeCons: result.activeCons,
          maxCons: result.maxCons,
          timezone: result.timezone,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const data: AccessDiagnosis = await res.json();
      setDiagnosis(data);
    } catch {
      // Create sensible fallback diagnosis
      setDiagnosis({
        geoLockStatus: isSaturated ? 'SATURATED_BLOCKED' : 'UNKNOWN',
        geoLockLabel: isSaturated ? `Bloqueo por Cupo Saturado (${numActive}/${numMax})` : 'Diagnóstico No Disponible',
        geoLockColor: isSaturated ? 'rose' : 'amber',
        country: localGeo.country,
        flag: localGeo.flag,
        region: localGeo.region,
        timezone: result.timezone || 'UTC',
        connectionState: isSaturated ? 'SATURATED' : 'AVAILABLE',
        activeCons: numActive,
        maxCons: numMax,
        isSaturated,
        connectionsSummary: isSaturated 
          ? `Línea saturada: ${numActive} de ${numMax} conexiones permitidas en uso simultáneo.`
          : `Conexiones: ${numActive} de ${numMax ?? '∞'} en uso.`,
        geoExplanation: isSaturated
          ? `El servidor tiene todas las ranuras ocupadas (${numActive}/${numMax}). El panel Xtream Codes deniega cualquier nueva transmisión de video con error HTTP 403.`
          : 'Verifica la conexión a internet y el estado del servidor para completar el sondeo de red.',
        recommendations: isSaturated
          ? ['Desconecta al menos un dispositivo para liberar una conexión de streaming.']
          : ['Prueba a reproducir un canal en la opción "Probar Canal Random (Smart TV)".'],
      });
    } finally {
      setLoading(false);
    }
  };

  // Run automatically when result changes
  useEffect(() => {
    runDiagnostic();
  }, [result.host, result.username]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Background ambient glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Diagnóstico de Acceso y Geolocalización
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                Geo-Lock & Conexiones
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis de apertura mundial vs bloqueo por país y detección de saturación de dispositivos
            </p>
          </div>
        </div>

        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          title="Reejecutar sondeo de red y geolocalización"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{loading ? 'Analizando...' : 'Volver a Sondear'}</span>
        </button>
      </div>

      {/* Main 2-Column Comparison Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============================================================ */}
        {/* PANEL 1: Geo-Lock & Country Origin                           */}
        {/* ============================================================ */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Apertura Geográfica / Restricción de País
              </span>
              <span className="text-xl" title={diagnosis?.country || localGeo.country}>
                {diagnosis?.flag || localGeo.flag}
              </span>
            </div>

            {/* Country and Timezone Tag */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700/70 px-2.5 py-1 rounded-lg text-xs font-semibold text-white">
                <span>{diagnosis?.flag || localGeo.flag}</span>
                <span>{diagnosis?.country || localGeo.country}</span>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 px-2 py-1 rounded-lg">
                Zona: {diagnosis?.timezone || result.timezone || 'UTC'}
              </span>
            </div>

            {/* Status Indicator Badge */}
            {diagnosis?.geoLockStatus === 'OPEN_WORLD' ? (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <Unlock className="w-4 h-4 shrink-0" />
                  <span>🌍 Lista Abierta Mundialmente (Sin Geo-Bloqueo)</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {diagnosis.geoExplanation}
                </p>
              </div>
            ) : diagnosis?.geoLockStatus === 'GEO_RESTRICTED' ? (
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>🔒 Geo-Restringida / Bloqueada por País ({diagnosis?.country})</span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  {diagnosis.geoExplanation}
                </p>
              </div>
            ) : diagnosis?.geoLockStatus === 'SATURATED_BLOCKED' ? (
              <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>⛔ Bloqueo por Cupo de Conexiones Lleno ({numActive}/{numMax})</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {diagnosis.geoExplanation}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Sondeo en curso o Servidor Estándar</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diagnosis?.geoExplanation || 'Comprobando la entrega de paquetes multimedia en directo...'}
                </p>
              </div>
            )}
          </div>

          {/* Technical sub-details */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              Latencia Video: <strong className="text-cyan-300 font-mono">{diagnosis?.latencyMs ?? result.latencyMs} ms</strong>
            </span>
            <span>
              {diagnosis?.wafDetected ? (
                <span className="text-amber-400 font-semibold">⚠️ Cloudflare / WAF Activo</span>
              ) : (
                <span className="text-slate-500">Transmisión Directa</span>
              )}
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PANEL 2: Connection Saturation & Dispositivos en Uso         */}
        {/* ============================================================ */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Saturación de Conexiones Simultáneas
              </span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                isSaturated
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {numActive} / {numMax !== null ? numMax : '∞'}
              </span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Dispositivos en reproducción:</span>
                <span className="font-bold text-white font-mono">
                  {numActive} de {numMax !== null ? `${numMax} permitidos` : 'Ilimitados'}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isSaturated
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-sm shadow-rose-500/50'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  }`}
                  style={{
                    width: numMax ? `${Math.min(100, Math.max(10, (numActive / numMax) * 100))}%` : '20%',
                  }}
                />
              </div>
            </div>

            {/* Diagnostic Message */}
            {isSaturated ? (
              <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>⚠️ Línea Saturada: No hay cupo libre</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  Tu cuenta alcanzó el máximo de <strong>{numMax} conexiones activas</strong>. Cuando una cuenta IPTV está saturada, el servidor <strong>rechaza cualquier intento de reproducir canales</strong> con error 401/403 o no envía imagen (pantalla negra).
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>🟢 Ranuras Disponibles para Streaming</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {numMax !== null
                    ? `Tienes ${numMax - numActive} ranura(s) libre(s) de ${numMax} para ver canales en directo sin interferencias ni cortes.`
                    : 'La cuenta no tiene límite estricto de conexiones simultáneas.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action / Notice */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isSaturated ? (
                <span className="text-rose-400 font-semibold">Desconecta 1 dispositivo para ver video</span>
              ) : (
                <span className="text-emerald-400 font-semibold">✓ Listo para reproducir en Smart TV</span>
              )}
            </span>
            <span className="font-mono text-slate-500">
              HTTP {diagnosis?.httpStatus ?? (isSaturated ? 403 : 200)}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations & Tips Banner */}
      {diagnosis?.recommendations && diagnosis.recommendations.length > 0 && (
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
            <Tv className="w-3.5 h-3.5" />
            <span>Recomendaciones para Reproducción y Estabilidad:</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
            {diagnosis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start space-x-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/70">
                <span className="text-cyan-400 font-bold">•</span>
                <span className="leading-tight">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
