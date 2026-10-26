import React, { useState } from 'react';
import { SavedAccount } from '../types/iptv';
import { 
  BookmarkCheck, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RotateCw, 
  Calendar, 
  Clock, 
  Server, 
  User, 
  Key, 
  Download,
  Search
} from 'lucide-react';

interface SavedAccountsProps {
  accounts: SavedAccount[];
  onDeleteAccount: (id: string) => void;
  onClearAll: () => void;
  onSelectAccountToCheck: (account: { host: string; username: string; password?: string }) => void;
}

export const SavedAccounts: React.FC<SavedAccountsProps> = ({
  accounts,
  onDeleteAccount,
  onClearAll,
  onSelectAccountToCheck,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      acc.host.toLowerCase().includes(q) ||
      acc.username.toLowerCase().includes(q) ||
      (acc.country || '').toLowerCase().includes(q) ||
      (acc.timezone || '').toLowerCase().includes(q)
    );
  });

  const exportSavedTxt = () => {
    if (accounts.length === 0) return;
    let txt = '--- CUENTAS IPTV GUARDADAS ---\n\n';
    accounts.forEach((acc, idx) => {
      txt += `#${idx + 1} - ${acc.country || 'Sin país'} (${acc.flag || '🌐'})\n`;
      txt += `Host: ${acc.host}\n`;
      txt += `Usuario: ${acc.username}\n`;
      txt += `Contraseña: ${acc.password || ''}\n`;
      txt += `Vencimiento: ${acc.expDate || 'Ilimitada'}\n`;
      txt += `Zona Horaria: ${acc.timezone || 'No especificada'}\n`;
      txt += `Guardada: ${acc.savedAt}\n`;
      txt += '------------------------------------\n';
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas_guardadas_iptv_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-cyan-400" />
              <span>Cuentas Guardadas</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono px-2 py-0.5 rounded-full ml-1">
                {accounts.length}
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Lista de cuentas salvadas con fecha de vencimiento, credenciales, país y zona horaria para consulta y re-verificación rápida.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {accounts.length > 0 && (
              <>
                <button
                  onClick={exportSavedTxt}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Descargar Lista</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de que deseas vaciar todas las cuentas guardadas?')) {
                      onClearAll();
                    }
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Todo</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {accounts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuario, host, país o zona horaria..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {accounts.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto">
            <BookmarkCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No tienes cuentas guardadas todavía</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cuando compruebes una cuenta en el <strong>Modo Individual</strong>, presiona el botón{' '}
            <span className="text-cyan-400 font-semibold">"Salvar Cuenta"</span> para agregarla a esta lista con su
            fecha de vencimiento, servidor, país y zona horaria.
          </p>
        </div>
      ) : (
        /* Enumerated List Cards */
        <div className="space-y-4">
          {filteredAccounts.map((acc, index) => {
            const isPasswordVisible = visiblePasswords[acc.id] || false;

            return (
              <div
                key={acc.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Number and Title/Country */}
                  <div className="flex items-start space-x-3.5">
                    {/* Enumeration Badge */}
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold font-mono text-sm shrink-0">
                      #{index + 1}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Country & Flag Badge */}
                        <span className="text-sm font-bold text-white flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 shadow-sm">
                          <span className="text-2xl leading-none">{acc.flag || '🌐'}</span>
                          <span className="font-semibold text-slate-100">{acc.country || 'Servidor Internacional'}</span>
                        </span>

                        {/* Status Label if available */}
                        {acc.statusLabel && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              acc.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : acc.status === 'EXPIRED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {acc.statusLabel}
                          </span>
                        )}

                        {acc.isUnlimited && (
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Ilimitada
                          </span>
                        )}

                        {acc.isSaturated && (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            Línea Saturada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Zona Horaria:</span>
                        <span className="font-mono text-slate-300 font-semibold">
                          {acc.timezone || 'No especificada por el servidor'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center space-x-2 self-end lg:self-center">
                    <button
                      onClick={() => onSelectAccountToCheck({ host: acc.host, username: acc.username, password: acc.password })}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                      title="Cargar y re-comprobar cuenta en vivo"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Re-comprobar</span>
                    </button>

                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                      title="Eliminar de cuentas guardadas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                  {/* Host */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider flex items-center gap-1">
                        <Server className="w-3 h-3 text-cyan-400" />
                        Host / Servidor
                      </span>
                      <span className="font-mono text-slate-200 truncate block mt-0.5" title={acc.host}>
                        {acc.host}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(acc.host, `host_${acc.id}`)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Copiar Host"
                    >
                      {copiedKey === `host_${acc.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Username */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" />
                        Usuario
                      </span>
                      <span className="font-mono font-semibold text-slate-100 truncate block mt-0.5">
                        {acc.username}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(acc.username, `user_${acc.id}`)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Copiar Usuario"
                    >
                      {copiedKey === `user_${acc.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Password */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider flex items-center gap-1">
                        <Key className="w-3 h-3 text-cyan-400" />
                        Contraseña
                      </span>
                      <span className="font-mono text-slate-200 truncate block mt-0.5">
                        {isPasswordVisible ? acc.password || '(Sin clave)' : '••••••••'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-0.5 shrink-0">
                      <button
                        onClick={() => togglePasswordVisibility(acc.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                        title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(acc.password || '', `pass_${acc.id}`)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Copiar Contraseña"
                      >
                        {copiedKey === `pass_${acc.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expiration Date & Remaining Days (Highlighted Big) */}
                <div className="mt-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Fecha y Hora de Término</span>
                    </span>
                    <div className="font-mono text-sm sm:text-base font-bold text-slate-100">
                      {acc.expDate || 'Sin fecha informada por el servidor'}
                    </div>
                  </div>

                  {/* Remaining Days in BIG */}
                  <div className="shrink-0">
                    {acc.isUnlimited ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">VIGENCIA:</span>
                        <span className="font-brand font-black text-2xl sm:text-3xl text-emerald-300 tracking-tight leading-none">
                          ILIMITADA ∞
                        </span>
                      </div>
                    ) : acc.daysRemaining !== null && acc.daysRemaining !== undefined ? (
                      acc.daysRemaining > 0 ? (
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">QUEDAN:</span>
                          <span className="font-brand font-black text-2xl sm:text-3xl text-emerald-300 tracking-tight leading-none">
                            {acc.daysRemaining} {acc.daysRemaining === 1 ? 'DÍA' : 'DÍAS'}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 shadow-lg shadow-rose-500/10">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">ESTADO:</span>
                          <span className="font-brand font-black text-xl sm:text-2xl text-rose-300 tracking-tight leading-none">
                            VENCIDA HACE {Math.abs(acc.daysRemaining)} {Math.abs(acc.daysRemaining) === 1 ? 'DÍA' : 'DÍAS'}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-slate-500 italic">Sin datos de expiración</span>
                    )}
                  </div>
                </div>

                {/* Footer timestamp */}
                <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Guardado el: {acc.savedAt}</span>
                  <button
                    onClick={() => {
                      const fullLine = `${acc.host} ${acc.username} ${acc.password || ''}`;
                      handleCopy(fullLine, `combo_${acc.id}`);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {copiedKey === `combo_${acc.id}` ? '¡Combo copiado!' : 'Copiar formato: host user pass'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
