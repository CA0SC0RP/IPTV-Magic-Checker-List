import React, { useState } from 'react';
import { Copy, Check, Link, Radio, Terminal, FileText, Globe } from 'lucide-react';

export const LinkGenerator: React.FC = () => {
  const [host, setHost] = useState('http://iptv-magic-demo.cloud:8080');
  const [username, setUsername] = useState('demo_vip');
  const [password, setPassword] = useState('vip2026');
  const [streamFormat, setStreamFormat] = useState<'ts' | 'm3u8'>('ts');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanHost = host.trim().replace(/\/+$/, '');

  const m3uPlusUrl = `${cleanHost}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=${streamFormat}`;
  const epgUrl = `${cleanHost}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const playerApiUrl = `${cleanHost}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const enigma2Command = `wget -O /etc/enigma2/iptv.sh "${cleanHost}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=enigma22_script&output=ts" && chmod 777 /etc/enigma2/iptv.sh && /etc/enigma2/iptv.sh`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Link className="w-5 h-5 text-cyan-400" />
          Generador de Enlaces Xtream Codes & M3U Plus
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Convierte credenciales de servidor en enlaces compatibles con VLC, Kodi, IPTV Smarters, TiviMate, SS IPTV, Perfect Player y scripts Enigma2.
        </p>

        {/* Input fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Host / Servidor IPTV
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="http://servidor:puerto"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Contraseña
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-200"
            />
          </div>
        </div>

        {/* Format Selector */}
        <div className="mt-4 flex items-center space-x-4 text-xs">
          <span className="text-slate-400 font-medium">Formato de Salida de Stream:</span>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={streamFormat === 'ts'}
              onChange={() => setStreamFormat('ts')}
              className="text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-slate-200 font-mono">MPEG-TS (.ts)</span>
          </label>
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="radio"
              checked={streamFormat === 'm3u8'}
              onChange={() => setStreamFormat('m3u8')}
              className="text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-slate-200 font-mono">HLS (.m3u8)</span>
          </label>
        </div>
      </div>

      {/* Generated Links Cards */}
      <div className="space-y-4">
        {/* M3U Plus */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              Lista M3U Plus Completa (Con Categorías y Logos)
            </span>
            <button
              onClick={() => handleCopy(m3uPlusUrl, 'm3uplus')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedKey === 'm3uplus' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
            {m3uPlusUrl}
          </div>
          <p className="text-[11px] text-slate-500">
            Recomendado para TiviMate, IPTV Smarters, VLC, Perfect Player y aplicaciones Smart TV.
          </p>
        </div>

        {/* EPG XMLTV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Guía Electrónica de Programación (EPG XMLTV)
            </span>
            <button
              onClick={() => handleCopy(epgUrl, 'epg')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedKey === 'epg' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
            {epgUrl}
          </div>
        </div>

        {/* Player API */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              Endpoint API Xtream (player_api.php)
            </span>
            <button
              onClick={() => handleCopy(playerApiUrl, 'api')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedKey === 'api' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
            {playerApiUrl}
          </div>
        </div>

        {/* Enigma2 Shell command */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              Script de Autoinstalación Enigma2 (Telnet / SSH)
            </span>
            <button
              onClick={() => handleCopy(enigma2Command, 'enigma')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              {copiedKey === 'enigma' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Comando</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all select-all">
            {enigma2Command}
          </div>
        </div>
      </div>
    </div>
  );
};
