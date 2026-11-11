import { useEffect, useState } from 'react';
import { syncEngine, SyncState } from '../services/syncEngine';

export function useOnlineStatus() {
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    const unsub = syncEngine.subscribe((newState) => {
      setState(newState);
    });
    return () => unsub();
  }, []);

  return {
    isOnline: state.isOnline,
    isSimulatedOffline: state.isSimulatedOffline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    lastSyncedAt: state.lastSyncedAt,
    lastError: state.lastError,
    toggleSimulatedOffline: () => syncEngine.toggleSimulatedOffline(),
    syncNow: () => syncEngine.syncPendingMutations()
  };
}
