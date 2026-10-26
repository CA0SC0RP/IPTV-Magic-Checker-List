import React from 'react';
import { Layers, HelpCircle, ShieldCheck, Zap, BookmarkCheck } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface HeaderProps {
  activeTab: 'single' | 'batch' | 'saved' | 'diagnostics';
  onSelectTab: (tab: 'single' | 'batch' | 'saved' | 'diagnostics') => void;
  onLoadMockDemo: () => void;
  savedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onLoadMockDemo,
  savedCount = 0,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Modern Typography */}
          <div className="flex items-center space-x-3.5">
            <AppLogo className="w-11 h-11 cursor-pointer hover:scale-105 transition-transform" size={44} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-brand font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                  IPTV MAGIC CHECKER
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block tracking-wide">
                Diagnóstico & Verificación de Cuentas Xtream Codes
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Visible on Tablet/Desktop, Mobile uses Bottom Dock) */}
          <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('single')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
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
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Por Lotes</span>
            </button>

            {/* Saved Accounts Tab */}
            <button
              onClick={() => onSelectTab('saved')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Cuentas Guardadas</span>
              {savedCount > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'saved' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('diagnostics')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
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
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all cursor-pointer"
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
