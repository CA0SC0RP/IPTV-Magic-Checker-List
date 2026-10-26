import { API_BASE_URL } from '../utils/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Dices, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Copy, 
  Check, 
  ExternalLink,
  Tv,
  Wifi,
  Sparkles,
  Activity
} from 'lucide-react';

interface ChannelInfo {
  streamId: number | string;
  name: string;
  category?: string;
  totalChannels?: number;
  streamUrl: string;
  streamHlsUrl?: string;
  previewVideoUrl?: string;
}

interface RetroTvPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  username: string;
  password?: string;
}

export const RetroTvPlayer: React.FC<RetroTvPlayerProps> = ({
  isOpen,
  onClose,
  host,
  username,
  password,
}) => {
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isTuning, setIsTuning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamProbeOk, setStreamProbeOk] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [probeDiagnostic, setProbeDiagnostic] = useState<{ title?: string; explanation?: string; httpStatus?: number } | null>(null);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch random channel
  const fetchRandomChannel = async () => {
    setLoading(true);
    setIsTuning(true);
    setErrorMsg(null);
    setStreamProbeOk(null);
    setProbeDiagnostic(null);
    setVideoError(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/get-random-channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, username, password }),
      });

      const data = await res.json();

      if (data.success) {
        setChannel(data);

        // Run stream test probe in background
        const probeStart = Date.now();
        fetch(`${API_BASE_URL}/api/test-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamUrl: data.streamUrl, timeoutMs: 5000 }),
        })
          .then((r) => r.json())
          .then((probe) => {
            setStreamProbeOk(probe.reachable);
            setLatencyMs(Date.now() - probeStart);
            setProbeDiagnostic({
              title: probe.diagnosticTitle,
              explanation: probe.diagnosticExplanation,
              httpStatus: probe.httpStatus,
            });
          })
          .catch(() => {
            setStreamProbeOk(false);
          });
      } else {
        setErrorMsg(data.error || 'No se pudo obtener un canal aleatorio.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de conexión');
    } finally {
      setTimeout(() => {
        setIsTuning(false);
        setLoading(false);
      }, 400);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRandomChannel();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (channel?.streamUrl) {
      navigator.clipboard.writeText(channel.streamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center max-w-xl w-full">
        {/* ---------------------------------------------------- */}
        {/* MODERN SMART TV / FLOATING SCREEN CASING             */}
        {/* Matches app signature: Slate-900 + Electric Cyan    */}
        {/* ---------------------------------------------------- */}
        <div className="w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_40px_rgba(6,182,212,0.12)] relative overflow-hidden">
          {/* Subtle Ambient Glow on top */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar: TV Brand & Close 'X' Button */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Tv className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-brand font-black text-sm tracking-tight text-white">
                    TELEVISOR EN VIVO
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.2 rounded-full font-mono">
                    Canal Random
                  </span>
                </div>
              </div>
            </div>

            {/* Small 'X' button to close */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
              title="Cerrar reproductor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* -------------------------------------------------- */}
          {/* 16:9 WIDESCREEN DISPLAY (Ultra-thin Modern Bezel)  */}
          {/* -------------------------------------------------- */}
          <div className="relative w-full aspect-video bg-black rounded-2xl border-2 border-slate-800 shadow-[inset_0_0_30px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center">
            {/* On-Screen Display (OSD): Channel ID and Category */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none text-[11px] font-mono">
              <span className="bg-slate-950/80 backdrop-blur text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-bold flex items-center gap-1.5 shadow-md">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>CH {channel ? String(channel.streamId) : '--'} • {channel?.category || 'EN DIRECTO'}</span>
              </span>

              <span className="bg-slate-950/80 backdrop-blur text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>SEÑAL EN VIVO</span>
              </span>
            </div>

            {/* Channel Name Banner at bottom of screen */}
            {channel && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 pointer-events-none bg-slate-950/85 backdrop-blur text-white text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-700/80 truncate shadow-lg flex items-center justify-between">
                <span className="truncate">▶ {channel.name}</span>
                <span className="text-[10px] text-cyan-400 shrink-0 ml-2 font-normal">
                  {streamProbeOk ? `${latencyMs}ms` : '1080p'}
                </span>
              </div>
            )}

            {/* Tuning / Loading Animation */}
            {isTuning ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-cyan-300 font-mono text-xs z-10 space-y-2">
                <RotateCw className="w-7 h-7 animate-spin text-cyan-400" />
                <span className="text-xs font-bold tracking-wider animate-pulse">SINTONIZANDO CANAL REAL...</span>
              </div>
            ) : errorMsg ? (
              <div className="p-4 text-center text-rose-300 font-mono text-xs space-y-1.5 z-10">
                <div className="text-sm font-bold">⚠️ SIN SEÑAL EN ESTE CANAL</div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">{errorMsg}</p>
                <button
                  onClick={fetchRandomChannel}
                  className="mt-2 px-3 py-1 bg-slate-800 text-cyan-400 rounded-lg text-[11px] hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Probar otro canal
                </button>
              </div>
            ) : videoError ? (
              /* Fallback: Live Signal Monitor when browser cannot decode HTTP MPEG-TS natively */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

                {/* Animated Audio/Video Equalizer Bars */}
                <div className="flex items-end justify-center gap-1.5 h-12 mb-3 z-10">
                  {[35, 70, 50, 95, 60, 85, 40, 100, 55, 75, 90, 45, 80, 65].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-cyan-500 via-blue-500 to-emerald-400 rounded-full animate-pulse"
                      style={{ height: `${h}%`, animationDelay: `${(i % 5) * 120}ms`, animationDuration: '700ms' }}
                    />
                  ))}
                </div>

                <div className="z-10 max-w-md space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-cyan-300 font-mono font-bold text-xs">
                    <Activity className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span>EMISIÓN MPEG-TS ACTIVA • {streamProbeOk ? `${latencyMs}ms` : 'RECIBIENDO'}</span>
                  </div>

                  {probeDiagnostic?.title && streamProbeOk === false ? (
                    <div className="bg-rose-950/70 border border-rose-500/40 p-2.5 rounded-xl text-rose-200 text-xs text-left">
                      <strong className="block text-rose-300 font-semibold mb-0.5">
                        {probeDiagnostic.title}
                      </strong>
                      <span className="text-[11px] leading-relaxed block text-rose-200/90">
                        {probeDiagnostic.explanation}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      El servidor responde y envía datos. Los navegadores web no decodifican video <strong className="text-white">.TS</strong> directamente en HTML5 por seguridad (Mixed Content).
                    </p>
                  )}

                  <p className="text-[10px] text-cyan-400/90 font-mono">
                    💡 Para verlo en pantalla completa, usa el botón "Abrir en VLC" o cópialo en tu app IPTV.
                  </p>
                </div>
              </div>
            ) : (
              /* Live Video Stream (Plays when HLS/MP4 or compatible stream is served) */
              <video
                ref={videoRef}
                src={channel?.previewVideoUrl || channel?.streamHlsUrl || channel?.streamUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* -------------------------------------------------- */}
          {/* SMART TV CONTROL DECK (Matches App Buttons)       */}
          {/* -------------------------------------------------- */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Primary Action: Random Channel */}
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchRandomChannel}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Dices className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Probar Otro Canal Random</span>
              </button>

              {/* Audio / Mute toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}
                title={isMuted ? 'Activar audio' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? 'Silenciado' : 'Sonido ON'}</span>
              </button>
            </div>

            {/* Quick Actions Right */}
            <div className="flex items-center space-x-2">
              {streamProbeOk !== null && (
                <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{streamProbeOk ? `OK (${latencyMs}ms)` : 'Sin señal'}</span>
                </div>
              )}

              <button
                onClick={handleCopyUrl}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                title="Copiar URL directa del canal"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Stream'}</span>
              </button>

              {channel?.streamUrl && (
                <a
                  href={`vlc://${channel.streamUrl}`}
                  className="flex items-center space-x-1 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-colors"
                  title="Abrir en reproductor VLC"
                >
                  <span>Abrir en VLC</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
