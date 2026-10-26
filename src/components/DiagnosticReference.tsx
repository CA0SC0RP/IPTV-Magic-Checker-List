import React from 'react';
import { 
  AlertTriangle, 
  HelpCircle, 
  WifiOff, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Layers
} from 'lucide-react';

export const DiagnosticReference: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          Matriz de Diagnóstico y Criterios de Clasificación
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Como especifica el diseño original de <strong>IPTV Magic Checker</strong>, el sistema diferencia estrictamente
          entre <em>datos ausentes</em>, <em>estados desconocidos</em> y <em>errores de conexión</em>, evitando falsos positivos
          y falsos negativos comunes en comprobadores genéricos.
        </p>
      </div>

      {/* Grid of Diagnostic States */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Datos Ausentes */}
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Datos Ausentes (Data Absent)</h3>
              <span className="text-[11px] font-mono text-purple-400">Respuesta HTTP 200 con campos incompletos</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ocurre cuando el servidor IPTV responde con código HTTP 200 pero <strong>omite campos cruciales</strong> en su estructura JSON, tales como:
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>Ausencia del objeto raíz <code className="text-purple-300 font-mono">user_info</code>.</li>
            <li>Falta de fecha de vencimiento <code className="text-purple-300 font-mono">exp_date</code> (diferente de <code className="text-purple-300 font-mono">null</code> que significa ilimitada).</li>
            <li>Sin definición de conexiones máximas <code className="text-purple-300 font-mono">max_connections</code>.</li>
            <li>Ausencia del estado explícito de la cuenta.</li>
          </ul>
          <div className="text-[11px] bg-purple-950/40 text-purple-200 border border-purple-800/50 p-2.5 rounded-xl">
            <strong>Causa habitual:</strong> Paneles IPTV modificados o versiones legacy que devuelven estructuras personalizadas no conformes con Xtream Codes v2.
          </div>
        </div>

        {/* 2. Estados Desconocidos */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Estados Desconocidos (Unknown State)</h3>
              <span className="text-[11px] font-mono text-amber-400">Status string no estándar</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Se produce cuando el servidor entrega un valor en el campo <code className="text-amber-300 font-mono">status</code> que no coincide con los estándares de la industria (<code className="text-slate-300">Active</code>, <code className="text-slate-300">Expired</code>, <code className="text-slate-300">Banned</code>, <code className="text-slate-300">Disabled</code>).
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>Estados como <code className="text-amber-300 font-mono">PendingPayment</code>, <code className="text-amber-300 font-mono">Quarantine</code> o <code className="text-amber-300 font-mono">SuspendedByAdmin</code>.</li>
            <li>Cuentas en periodo de gracia o revisión de IP.</li>
            <li>Respuestas en texto plano o HTML cuando se esperaba JSON.</li>
          </ul>
          <div className="text-[11px] bg-amber-950/40 text-amber-200 border border-amber-800/50 p-2.5 rounded-xl">
            <strong>Acción del Checker:</strong> Se reporta el valor textual exacto emitido por el servidor para que el usuario conozca la respuesta literal.
          </div>
        </div>

        {/* 3. Errores de Conexión */}
        <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Errores de Conexión (Connection Error)</h3>
              <span className="text-[11px] font-mono text-red-400">Imposibilidad física o lógica de conectar</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            A diferencia de una credencial errónea, aquí el servidor <strong>no llegó a responder o no pudo ser contactado</strong>:
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li><strong>Timeout:</strong> El servidor excedió el tiempo límite (4s/8s/15s) sin enviar paquetes.</li>
            <li><strong>ECONNREFUSED:</strong> El puerto del servidor está cerrado o el servicio web de IPTV está caído.</li>
            <li><strong>ENOTFOUND / DNS:</strong> El dominio del host no resuelve en servidores de nombres.</li>
            <li><strong>HTTP 502 / 504:</strong> Gateway o proxy inverso caído.</li>
          </ul>
          <div className="text-[11px] bg-red-950/40 text-red-200 border border-red-800/50 p-2.5 rounded-xl">
            <strong>Diferenciación clave:</strong> No se descartan las credenciales, ya que la cuenta puede ser válida una vez restablecido el servidor.
          </div>
        </div>

        {/* 4. Errores de Autenticación */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Credenciales Inválidas (Auth Failed)</h3>
              <span className="text-[11px] font-mono text-rose-400">user_info.auth === 0</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            El servidor está 100% operativo y en línea, pero rechaza explícitamente el nombre de usuario o la contraseña proporcionada:
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>Usuario inexistente en la base de datos del panel.</li>
            <li>Contraseña incorrecta.</li>
            <li>Bloqueo por protección anti-bruteforce del servidor.</li>
          </ul>
          <div className="text-[11px] bg-rose-950/40 text-rose-200 border border-rose-800/50 p-2.5 rounded-xl">
            <strong>Criterio:</strong> El servidor respondió normalmente, indicando que el fallo radica en los datos de acceso suministrados.
          </div>
        </div>

        {/* 5. Cuentas Activas & Vencidas */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-3 md:col-span-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cuentas Activas vs. Cuentas Vencidas</h3>
              <span className="text-[11px] font-mono text-emerald-400">Validación temporal matemática</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Muchos paneles IPTV devuelven el atributo <code className="text-emerald-300 font-mono">status: "Active"</code> incluso en cuentas que han expirado hace meses. Nuestro checker realiza una <strong>comparación matemática estricta</strong> entre la fecha actual y la marca temporal de <code className="text-cyan-300 font-mono">exp_date</code>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <strong className="text-emerald-400 block mb-1">Activa y Vigente</strong>
              <span>Fecha de vencimiento mayor a la fecha actual o valor null (ilimitada).</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <strong className="text-amber-400 block mb-1">Cuenta Vencida</strong>
              <span>Fecha de expiración menor al día de hoy. Se calcula la cantidad exacta de días vencida.</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <strong className="text-blue-400 block mb-1">Cuenta Trial (Prueba)</strong>
              <span>Marcada por el servidor con <code className="text-blue-300 font-mono">is_trial: "1"</code>, generalmente con 24h a 72h de validez.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Privacy Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 space-y-1">
          <h4 className="font-bold text-slate-200">Privacidad y Seguridad en el Manejo de Credenciales</h4>
          <p>
            Cumpliendo con la directiva del proyecto (<em>"No se deben incluir credenciales reales en el repositorio"</em>),
            esta aplicación no almacena en bases de datos externas ni registra contraseñas en logs.
            Todas las consultas se efectúan mediante peticiones efímeras a través del proxy local de backend.
          </p>
        </div>
      </div>
    </div>
  );
};
