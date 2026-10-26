import { useState } from 'react';
import { Header } from './components/Header';
import { SingleChecker } from './components/SingleChecker';
import { BatchChecker } from './components/BatchChecker';
import { LinkGenerator } from './components/LinkGenerator';
import { DiagnosticReference } from './components/DiagnosticReference';
import { Tv, Heart, CheckCircle2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'generator' | 'diagnostics'>('single');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const handleLoadMockDemo = () => {
    setActiveTab('batch');
    setDemoNotice('Se ha seleccionado el modo por lotes. Pulsa "Cargar Lote Demo" para ejecutar el conjunto de prueba.');
    setTimeout(() => setDemoNotice(null), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLoadMockDemo={handleLoadMockDemo}
      />

      {/* Demo Notification Toast */}
      {demoNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{demoNotice}</span>
            </div>
            <button
              onClick={() => setDemoNotice(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold ml-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'single' && (
          <SingleChecker
            onSendToBatch={() => {
              setActiveTab('batch');
            }}
          />
        )}
        {activeTab === 'batch' && <BatchChecker />}
        {activeTab === 'generator' && <LinkGenerator />}
        {activeTab === 'diagnostics' && <DiagnosticReference />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-400">
            <Tv className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">IPTV Magic Checker List</span>
            <span>—</span>
            <span>Diagnóstico Profesional para Servidores Xtream Codes & M3U</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-500">
            <span>Diseñado con</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current inline" />
            <span>para una verificación rápida y segura</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
