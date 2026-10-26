import React from 'react';
import { Zap, Layers, BookmarkCheck, HelpCircle } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'single' | 'batch' | 'saved' | 'diagnostics';
  onSelectTab: (tab: 'single' | 'batch' | 'saved' | 'diagnostics') => void;
  savedCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedCount = 0,
}) => {
  const tabs = [
    {
      id: 'single' as const,
      label: 'Individual',
      icon: Zap,
    },
    {
      id: 'batch' as const,
      label: 'Por Lotes',
      icon: Layers,
    },
    {
      id: 'saved' as const,
      label: 'Guardadas',
      icon: BookmarkCheck,
      badge: savedCount > 0 ? savedCount : null,
    },
    {
      id: 'diagnostics' as const,
      label: 'Diagnóstico',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
      <nav className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                onSelectTab(tab.id);
                // Scroll gently to top on tab switch
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 relative transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-cyan-500/15 scale-110 text-cyan-400 shadow-sm shadow-cyan-500/20' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-cyan-500 text-slate-950 text-[10px] font-black font-mono w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight truncate">
                {tab.label}
              </span>

              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
