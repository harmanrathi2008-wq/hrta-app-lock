import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShieldCheck, Lock, Unlock, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { AppInfo } from '../../types';
import { NativeBridgeService } from '../../services/nativeBridge';
import { Footer } from '../../components/common/Footer';

interface AppSelectionScreenProps {
  onSaved: () => void;
  onBack?: () => void;
  isManageMode?: boolean;
}

export const AppSelectionScreen: React.FC<AppSelectionScreenProps> = ({
  onSaved,
  onBack,
  isManageMode = false,
}) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [protectedSet, setProtectedSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadApps = async () => {
      setIsLoading(true);
      try {
        const [installed, protectedPkgs] = await Promise.all([
          NativeBridgeService.getInstalledApps(),
          NativeBridgeService.getProtectedApps(),
        ]);
        setApps(installed);
        setProtectedSet(new Set(protectedPkgs));
      } finally {
        setIsLoading(false);
      }
    };
    loadApps();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    apps.forEach(app => {
      if (app.category) set.add(app.category);
    });
    return Array.from(set);
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || app.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  const handleToggle = (packageName: string) => {
    setProtectedSet(prev => {
      const next = new Set(prev);
      if (next.has(packageName)) {
        next.delete(packageName);
      } else {
        next.add(packageName);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setProtectedSet(prev => {
      const next = new Set(prev);
      filteredApps.forEach(app => next.add(app.packageName));
      return next;
    });
  };

  const handleClearAllFiltered = () => {
    setProtectedSet(prev => {
      const next = new Set(prev);
      filteredApps.forEach(app => next.delete(app.packageName));
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const packages = Array.from(protectedSet);
      await NativeBridgeService.saveProtectedApps(packages);
      await NativeBridgeService.startMonitoringService();
      onSaved();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070A10] text-[#F8FAFC] select-none">
      <header className="sticky top-0 z-30 bg-[#070A10]/95 backdrop-blur-md border-b border-[#1F2B3E] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-[#0D131F] border border-[#1F2B3E] text-[#94A3B8] hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                {isManageMode ? 'MANAGE PROTECTED APPS' : 'SELECT PROTECTED APPS'}
              </h1>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                {protectedSet.size} of {apps.length} applications protected
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
            {protectedSet.size} ACTIVE
          </span>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by app name or package..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D131F] border border-[#1F2B3E] text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00F0FF] font-mono"
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={'px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all ' + (selectedCategory === cat ? 'bg-[#00F0FF] text-[#070A10] font-bold shadow-glow-cyan' : 'bg-[#0D131F] text-[#94A3B8] hover:text-white border border-[#1F2B3E]')}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 pl-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[11px] text-[#00F0FF] hover:underline flex items-center space-x-1"
            >
              <CheckSquare className="w-3 h-3" />
              <span>All</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllFiltered}
              className="text-[11px] text-[#94A3B8] hover:text-[#EF4444] flex items-center space-x-1"
            >
              <Square className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-2 overflow-y-auto max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-[#94A3B8]">
            Scanning installed applications...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#64748B]">
            No applications match your search.
          </div>
        ) : (
          filteredApps.map(app => {
            const isProt = protectedSet.has(app.packageName);
            return (
              <div
                key={app.packageName}
                onClick={() => handleToggle(app.packageName)}
                className={'flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ' + (isProt ? 'bg-[#0D131F] border-[#00F0FF]/50 shadow-glow-cyan' : 'bg-[#0D131F]/60 border-[#1F2B3E] hover:border-[#2A3B54]')}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div
                    className={'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-mono border ' + (isProt ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40' : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]')}
                  >
                    {app.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h2 className="text-sm font-bold text-white truncate font-sans">
                        {app.name}
                      </h2>
                      {app.category && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
                          {app.category}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#64748B] truncate">
                      {app.packageName}
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {isProt ? (
                    <div className="w-9 h-9 rounded-xl bg-[#00F0FF] text-[#070A10] flex items-center justify-center shadow-glow-cyan">
                      <Lock className="w-4 h-4 fill-current" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-[#1E293B] text-[#64748B] flex items-center justify-center border border-[#334155]">
                      <Unlock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      <div className="sticky bottom-0 z-30 bg-[#070A10]/95 backdrop-blur-md border-t border-[#1F2B3E] px-5 py-4 max-w-lg mx-auto w-full">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#00F0FF] text-[#070A10] font-bold text-base tracking-wider uppercase font-mono shadow-glow-cyan hover:bg-[#00D8E6] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <ShieldCheck className="w-5 h-5 fill-current" />
          <span>{isSaving ? 'APPLYING SECURITY CONFIG...' : 'SAVE CONFIGURATION (' + protectedSet.size + ' APPS)'}</span>
        </button>

        <Footer systemStatus="CONFIGURATION ENGINE READY" className="py-2" />
      </div>
    </div>
  );
};
