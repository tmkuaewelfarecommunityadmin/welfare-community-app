import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language } from '../types';

interface Props {
  lang: Language;
}

export const OfflineIndicator: React.FC<Props> = ({ lang }) => {
  const { isOnline, isSimulatedOffline, isSyncing, pendingCount, syncNow, toggleSimulatedOffline } = useOnlineStatus();

  return (
    <div className="w-full bg-stone-900 text-white text-xs border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Connectivity Status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'இணையம் இணைப்பில் உள்ளது' : 'Online & Connected'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium animate-pulse">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {lang === 'ta' 
                  ? 'ஆஃப்லைன் முறை (உள்ளூர் சேமிப்பகம் செயலில் உள்ளது)' 
                  : 'Offline Mode (Transactions safely saved locally)'}
              </span>
            </span>
          )}

          {isSimulatedOffline && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/40 text-amber-200 text-[11px] border border-amber-700/50">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {lang === 'ta' ? 'சோதனை நிலை' : 'Simulated'}
            </span>
          )}
        </div>

        {/* Right: Sync Queue Counter and Action Controls */}
        <div className="flex items-center gap-2.5">
          {pendingCount > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-300 font-medium">
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 font-bold text-[10px]">
                {pendingCount}
              </span>
              <span className="hidden sm:inline">
                {lang === 'ta' ? 'பதிவுகள் காத்திருக்கின்றன' : 'queued for sync'}
              </span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'அனைத்தும் ஒத்திசைக்கப்பட்டது' : 'Fully Synchronized'}</span>
            </div>
          )}

          {/* Sync Trigger Button */}
          {isOnline && pendingCount > 0 && (
            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (lang === 'ta' ? 'ஒத்திசைக்கிறது...' : 'Syncing...') : (lang === 'ta' ? 'ஒத்திசைக்க' : 'Sync Now')}</span>
            </button>
          )}

          {/* Toggle Simulator Button for Testing */}
          <button
            onClick={toggleSimulatedOffline}
            className="flex items-center gap-1 px-2 py-1 rounded border border-stone-700 hover:bg-stone-800 text-stone-300 text-[11px] transition"
            title="Toggle simulated offline mode for field testing"
          >
            {isSimulatedOffline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>{lang === 'ta' ? 'இணையத்தை மீட்க' : 'Restore Online'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>{lang === 'ta' ? 'ஆஃப்லைனில் சோதிக்க' : 'Simulate Offline'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
