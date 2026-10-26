import React from 'react';
import { Tv, Layers, Link as LinkIcon, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: 'single' | 'batch' | 'generator' | 'diagnostics';
  onSelectTab: (tab: 'single' | 'batch' | 'generator' | 'diagnostics') => void;
  onLoadMockDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab, onLoadMockDemo }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-white tracking-tight">IPTV Magic Checker</span>
                <span className="text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  v1.2 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Diagnóstico de servidores Xtream Codes & Listas M3U
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('single')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'single'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Modo Individual</span>
            </button>

            <button
              onClick={() => onSelectTab('batch')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'batch'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Por Lotes</span>
            </button>

            <button
              onClick={() => onSelectTab('generator')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden md:inline">Enlaces M3U</span>
              <span className="md:hidden">M3U</span>
            </button>

            <button
              onClick={() => onSelectTab('diagnostics')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'diagnostics'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden lg:inline">Diagnóstico & Ayuda</span>
              <span className="lg:hidden">Ayuda</span>
            </button>
          </nav>

          {/* Quick Demo Test Action */}
          <div className="hidden sm:flex items-center">
            <button
              onClick={onLoadMockDemo}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all"
              title="Cargar cuentas de prueba en el servidor demo integrado sin requerir credenciales reales"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Probar Cuentas Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
