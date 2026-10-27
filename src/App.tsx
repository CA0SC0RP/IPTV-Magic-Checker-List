import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SingleChecker } from './components/SingleChecker';
import { BatchChecker } from './components/BatchChecker';
import { SavedAccounts } from './components/SavedAccounts';
import { DiagnosticReference } from './components/DiagnosticReference';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppLogo } from './components/AppLogo';
import { Heart, CheckCircle2 } from 'lucide-react';
import { SavedAccount } from './types/iptv';

const STORAGE_KEY = 'iptv_magic_saved_accounts_v1';

export function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'saved' | 'diagnostics'>('single');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [initialAccountForSingle, setInitialAccountForSingle] = useState<{
    host: string;
    username: string;
    password?: string;
  } | null>(null);

  // Initialize saved accounts from localStorage
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
    } catch {
      // Ignore storage errors
    }
  }, [savedAccounts]);

  const handleSaveAccount = (newAccount: SavedAccount) => {
    setSavedAccounts((prev) => {
      // Filter out duplicate if same host and username
      const filtered = prev.filter(
        (a) => !(a.host === newAccount.host && a.username === newAccount.username)
      );
      return [newAccount, ...filtered];
    });

    setDemoNotice(`Cuenta de ${newAccount.username} guardada en tu lista exitosamente.`);
    setTimeout(() => setDemoNotice(null), 4000);
  };

  const handleDeleteSavedAccount = (id: string) => {
    setSavedAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearAllSaved = () => {
    setSavedAccounts([]);
  };

  const isAccountAlreadySaved = (host: string, username: string) => {
    return savedAccounts.some((a) => a.host === host && a.username === username);
  };

  const handleSelectAccountToCheck = (account: { host: string; username: string; password?: string }) => {
    setInitialAccountForSingle(account);
    setActiveTab('single');
  };

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
        savedCount={savedAccounts.length}
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
              className="text-emerald-400 hover:text-emerald-200 text-xs font-semibold ml-4 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 sm:pb-8">
        {activeTab === 'single' && (
          <SingleChecker
            initialAccount={initialAccountForSingle}
            onSendToBatch={() => {
              setActiveTab('batch');
            }}
            onSaveAccount={handleSaveAccount}
            isAccountAlreadySaved={isAccountAlreadySaved}
          />
        )}

        {activeTab === 'batch' && <BatchChecker onSaveAccount={handleSaveAccount} />}

        {activeTab === 'saved' && (
          <SavedAccounts
            accounts={savedAccounts}
            onDeleteAccount={handleDeleteSavedAccount}
            onClearAll={handleClearAllSaved}
            onSelectAccountToCheck={handleSelectAccountToCheck}
          />
        )}

        {activeTab === 'diagnostics' && <DiagnosticReference />}
      </main>

      {/* Mobile Sticky Bottom Navigation Dock (Thumb-friendly for mobile phones) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedAccounts.length}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mb-16 sm:mb-0 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 text-slate-400">
            <AppLogo className="w-6 h-6" size={24} />
            <span className="font-brand font-bold text-slate-200 tracking-wide">IPTV MAGIC CHECKER</span>
            <span>—</span>
            <span>Diagnóstico Profesional para Servidores Xtream Codes</span>
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
