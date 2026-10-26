import React, { useState, useRef } from 'react';
import { CheckResult, AccountInput } from '../types/iptv';
import { parseAccountList } from '../utils/parser';
import {
  Play,
  RotateCw,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Server,
  Trash2,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  StopCircle,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const DEMO_BATCH_ACCOUNTS: AccountInput[] = [
  { host: 'MOCK_DEMO', username: 'demo_vip', password: 'vip2026' },
  { host: 'MOCK_DEMO', username: 'demo_trial', password: 'trial123' },
  { host: 'MOCK_DEMO', username: 'demo_unlimited', password: 'unlimited77' },
  { host: 'MOCK_DEMO', username: 'demo_expired', password: 'exp123' },
  { host: 'MOCK_DEMO', username: 'demo_absent', password: 'absent123' },
  { host: 'MOCK_DEMO', username: 'demo_unknown', password: 'unk123' },
  { host: 'MOCK_DEMO', username: 'demo_baduser', password: 'wrongpassword' },
  { host: 'http://servidor-offline-falla.xyz:8080', username: 'testuser', password: 'secret123' },
];

export const BatchChecker: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [concurrency, setConcurrency] = useState(3);
  const [timeoutMs, setTimeoutMs] = useState(7000);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const abortControllerRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load demo batch
  const handleLoadDemo = () => {
    const formatted = DEMO_BATCH_ACCOUNTS.map(
      (a) => `${a.host === 'MOCK_DEMO' ? 'http://iptv-magic-demo.cloud:8080' : a.host} ${a.username} ${a.password}`
    ).join('\n');
    setInputText(formatted);
  };

  // Handle file upload (.txt, .m3u, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText((prev) => (prev ? `${prev}\n${content}` : content));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Run the batch verification
  const handleStartBatch = async () => {
    const parsedAccounts = parseAccountList(inputText);

    if (parsedAccounts.length === 0) {
      alert('No se detectaron cuentas válidas en el texto. Use el formato: servidor usuario contraseña o pegue enlaces M3U.');
      return;
    }

    setIsRunning(true);
    abortControllerRef.current = false;
    setResults([]);
    setProgress({ current: 0, total: parsedAccounts.length });

    const queue = [...parsedAccounts];
    const total = parsedAccounts.length;
    let completedCount = 0;

    // Map internal demo mock if needed
    const normalizedQueue = queue.map((acc) => {
      if (acc.host.includes('iptv-magic-demo')) {
        return { ...acc, host: 'MOCK_DEMO' };
      }
      return acc;
    });

    const activeWorkers = Math.min(concurrency, normalizedQueue.length);
    const workerPromises: Promise<void>[] = [];

    for (let w = 0; w < activeWorkers; w++) {
      workerPromises.push(
        (async () => {
          while (normalizedQueue.length > 0 && !abortControllerRef.current) {
            const item = normalizedQueue.shift();
            if (!item) break;

            try {
              const res = await fetch('/api/check-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  host: item.host,
                  username: item.username,
                  password: item.password || '',
                  timeoutMs,
                }),
              });

              const result: CheckResult = await res.json();
              if (item.host === 'MOCK_DEMO') {
                result.host = 'http://iptv-magic-demo.cloud:8080';
              }

              setResults((prev) => [result, ...prev]);
            } catch (err: any) {
              setResults((prev) => [
                {
                  id: `err_${Date.now()}_${Math.random()}`,
                  host: item.host === 'MOCK_DEMO' ? 'http://iptv-magic-demo.cloud:8080' : item.host,
                  username: item.username,
                  password: item.password,
                  status: 'CONNECTION_ERROR',
                  statusLabel: 'Error de Red Local',
                  statusColor: 'red',
                  latencyMs: 0,
                  missingFields: ['all'],
                  errorDetails: err?.message || 'Fallo de red',
                  checkedAt: new Date().toISOString(),
                },
                ...prev,
              ]);
            } finally {
              completedCount++;
              setProgress({ current: completedCount, total });
            }
          }
        })()
      );
    }

    await Promise.all(workerPromises);
    setIsRunning(false);
  };

  const handleStop = () => {
    abortControllerRef.current = true;
    setIsRunning(false);
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Export functions
  const exportActiveM3U = () => {
    const active = results.filter((r) => r.status === 'ACTIVE');
    if (active.length === 0) {
      alert('No hay cuentas activas para exportar.');
      return;
    }

    let m3uContent = '#EXTM3U\n';
    active.forEach((acc, idx) => {
      const url = `${acc.host}/get.php?username=${encodeURIComponent(acc.username)}&password=${encodeURIComponent(acc.password || '')}&type=m3u_plus&output=ts`;
      m3uContent += `#EXTINF:-1 tvg-id="" tvg-name="Cuenta ${idx + 1} (${acc.username})" group-title="IPTV Checker Valid",Cuenta ${idx + 1} - ${acc.username} (${acc.expDate || 'Ilimitada'})\n${url}\n`;
    });

    const blob = new Blob([m3uContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas_activas_${Date.now()}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (results.length === 0) {
      alert('No hay resultados para exportar.');
      return;
    }

    let csv = 'Servidor,Usuario,Contrasena,Estado,Etiqueta,Expiracion,Dias_Restantes,Max_Conexiones,Latencia_ms,Datos_Ausentes,Diagnostico\n';
    results.forEach((r) => {
      const cleanDiag = (r.errorDetails || '').replace(/"/g, '""');
      const missingStr = (r.missingFields || []).join(';');
      csv += `"${r.host}","${r.username}","${r.password || ''}","${r.status}","${r.statusLabel}","${r.expDate || 'N/A'}","${r.daysRemaining ?? 'N/A'}","${r.maxCons ?? 'N/A'}","${r.latencyMs}","${missingStr}","${cleanDiag}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_iptv_checker_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iptv_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Counters
  const countTotal = results.length;
  const countActive = results.filter((r) => r.status === 'ACTIVE').length;
  const countExpired = results.filter((r) => r.status === 'EXPIRED').length;
  const countAuthFail = results.filter((r) => r.status === 'AUTH_FAILED').length;
  const countConnError = results.filter((r) => r.status === 'CONNECTION_ERROR').length;
  const countAbsent = results.filter((r) => r.status === 'DATA_ABSENT').length;
  const countUnknown = results.filter((r) => r.status === 'UNKNOWN' || r.status === 'BANNED' || r.status === 'DISABLED').length;

  // Filtered list
  const filteredResults = results.filter((r) => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) {
      if (filterStatus === 'OTHER' && (r.status === 'BANNED' || r.status === 'DISABLED' || r.status === 'UNKNOWN')) {
        // match
      } else {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHost = r.host.toLowerCase().includes(q);
      const matchUser = r.username.toLowerCase().includes(q);
      const matchLabel = r.statusLabel.toLowerCase().includes(q);
      return matchHost || matchUser || matchLabel;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Verificación Masiva por Lotes (Batch Checker)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pega listas de cuentas en cualquier formato estándar o sube un archivo (.txt, .m3u, .csv).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.m3u,.m3u8,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Archivo</span>
            </button>
            <button
              onClick={handleLoadDemo}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-colors"
            >
              <span>Cargar Lote Demo</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <textarea
            rows={5}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Formatos soportados (una cuenta por línea):\nhttp://servidor:puerto usuario contraseña\nservidor:puerto:usuario:contraseña\nusuario:contraseña@servidor:puerto\nhttp://servidor:puerto/get.php?username=usuario&password=pass`}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 resize-y"
          />
        </div>

        {/* Configuration Bar & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-4">
            {/* Concurrency Selector */}
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Hilos Concurrentes:</span>
              <select
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                disabled={isRunning}
                className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 font-mono"
              >
                <option value={1}>1 hilo (Secuencial)</option>
                <option value={3}>3 hilos (Equilibrado)</option>
                <option value={5}>5 hilos (Rápido)</option>
                <option value={10}>10 hilos (Ultra)</option>
              </select>
            </div>

            {/* Timeout Selector */}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Timeout:</span>
              <select
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                disabled={isRunning}
                className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 font-mono"
              >
                <option value={4000}>4s</option>
                <option value={7000}>7s</option>
                <option value={12000}>12s</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inputText && (
              <button
                onClick={() => setInputText('')}
                disabled={isRunning}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Limpiar texto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-lg shadow-rose-600/20"
              >
                <StopCircle className="w-4 h-4" />
                <span>Detener Verificación</span>
              </button>
            ) : (
              <button
                onClick={handleStartBatch}
                disabled={!inputText.trim()}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Verificación por Lotes</span>
              </button>
            )}
          </div>
        </div>

        {/* Running Progress Bar */}
        {(isRunning || progress.total > 0) && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300 flex items-center gap-1.5">
                {isRunning && <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                Progreso: {progress.current} de {progress.total} verificadas
              </span>
              <span className="font-mono text-cyan-400">
                {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Counters & Stats Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Total */}
          <div
            onClick={() => setFilterStatus('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'ALL'
                ? 'bg-slate-800/90 border-cyan-500/50 ring-1 ring-cyan-500'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400">Total Consultadas</div>
            <div className="text-xl font-extrabold text-white font-mono mt-1">{countTotal}</div>
          </div>

          {/* Actives */}
          <div
            onClick={() => setFilterStatus('ACTIVE')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Activas</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-300 font-mono mt-1">{countActive}</div>
          </div>

          {/* Expired */}
          <div
            onClick={() => setFilterStatus('EXPIRED')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'EXPIRED'
                ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Vencidas</span>
            </div>
            <div className="text-xl font-extrabold text-amber-300 font-mono mt-1">{countExpired}</div>
          </div>

          {/* Auth Failed */}
          <div
            onClick={() => setFilterStatus('AUTH_FAILED')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'AUTH_FAILED'
                ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500'
                : 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Pass Inválido</span>
            </div>
            <div className="text-xl font-extrabold text-rose-300 font-mono mt-1">{countAuthFail}</div>
          </div>

          {/* Connection Error */}
          <div
            onClick={() => setFilterStatus('CONNECTION_ERROR')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'CONNECTION_ERROR'
                ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500'
                : 'bg-slate-900 border-slate-800 hover:border-red-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Caído / Timeout</span>
            </div>
            <div className="text-xl font-extrabold text-red-300 font-mono mt-1">{countConnError}</div>
          </div>

          {/* Data Absent */}
          <div
            onClick={() => setFilterStatus('DATA_ABSENT')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'DATA_ABSENT'
                ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                : 'bg-slate-900 border-slate-800 hover:border-purple-500/40'
            }`}
          >
            <div className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Datos Ausentes</span>
            </div>
            <div className="text-xl font-extrabold text-purple-300 font-mono mt-1">{countAbsent}</div>
          </div>

          {/* Other / Unknown */}
          <div
            onClick={() => setFilterStatus('OTHER')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              filterStatus === 'OTHER'
                ? 'bg-slate-700/60 border-slate-400 ring-1 ring-slate-400'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400">Otros / Ban</div>
            <div className="text-xl font-extrabold text-slate-300 font-mono mt-1">{countUnknown}</div>
          </div>
        </div>
      )}

      {/* Results Table Section */}
      {results.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por servidor, usuario o diagnóstico..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportActiveM3U}
                disabled={countActive === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
                title="Descargar archivo M3U con las cuentas activas para cualquier reproductor"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Activas (.m3u)</span>
              </button>

              <button
                onClick={exportCSV}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={exportJSON}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>JSON</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Servidor</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Conexiones</th>
                  <th className="px-4 py-3">Latencia</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredResults.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const m3uUrl = `${item.host}/get.php?username=${encodeURIComponent(item.username)}&password=${encodeURIComponent(item.password || '')}&type=m3u_plus&output=ts`;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`hover:bg-slate-850 transition-colors ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-950/10'
                            : item.status === 'EXPIRED'
                            ? 'bg-amber-950/10'
                            : item.status === 'CONNECTION_ERROR'
                            ? 'bg-red-950/10'
                            : ''
                        }`}
                      >
                        {/* Status Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : item.status === 'EXPIRED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.status === 'AUTH_FAILED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : item.status === 'CONNECTION_ERROR'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : item.status === 'DATA_ABSENT'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {item.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {item.status === 'EXPIRED' && <Clock className="w-3 h-3 text-amber-400" />}
                            {item.status === 'AUTH_FAILED' && <XCircle className="w-3 h-3 text-rose-400" />}
                            {item.status === 'CONNECTION_ERROR' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                            {item.statusLabel}
                          </span>
                        </td>

                        {/* Server */}
                        <td className="px-4 py-3 font-mono text-slate-300 max-w-xs truncate" title={item.host}>
                          {item.host}
                        </td>

                        {/* Username */}
                        <td className="px-4 py-3 font-mono font-medium text-slate-100">
                          {item.username}
                        </td>

                        {/* Expiry */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.isUnlimited ? (
                            <span className="text-emerald-400 font-semibold">Ilimitada</span>
                          ) : item.expDate ? (
                            <div>
                              <span className="text-slate-200 font-mono">{item.expDate}</span>
                              {item.daysRemaining !== null && item.daysRemaining !== undefined && (
                                <span
                                  className={`block text-[10px] ${
                                    item.daysRemaining > 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {item.daysRemaining > 0
                                    ? `(en ${item.daysRemaining} días)`
                                    : `(venció hace ${Math.abs(item.daysRemaining)} días)`}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Connections */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                          {item.maxCons !== null && item.maxCons !== undefined
                            ? `${item.activeCons ?? 0} / ${item.maxCons}`
                            : '—'}
                        </td>

                        {/* Latency */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-cyan-400">
                          {item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                          {item.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleCopy(m3uUrl, `m3u_${item.id}`)}
                              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors inline-block"
                              title="Copiar enlace M3U"
                            >
                              {copiedKey === `m3u_${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors inline-block"
                            title="Ver detalles de diagnóstico"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Diagnosis message */}
                              <div className="md:col-span-2 space-y-1">
                                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                                  Diagnóstico del Servidor:
                                </span>
                                <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                                  {item.errorDetails || 'Verificación exitosa. Todos los parámetros recibidos correctamente.'}
                                </p>
                                {item.missingFields && item.missingFields.length > 0 && (
                                  <p className="text-[11px] text-purple-300 mt-1">
                                    ⚠️ Campos no provistos por el servidor: {item.missingFields.join(', ')}
                                  </p>
                                )}
                              </div>

                              {/* Technical metadata */}
                              <div className="space-y-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                                <div className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                                  Metadatos:
                                </div>
                                <div className="text-slate-300">Zona: {item.timezone || 'No especificada'}</div>
                                <div className="text-slate-300">Hora: {item.serverTime || 'No especificada'}</div>
                                <div className="text-slate-300">Formatos: {item.allowedFormats?.join(', ') || 'ts, m3u8'}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
