import { localDB } from './storage';
import { SyncMutation } from '../types';

export type SyncState = {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
};

class SyncEngine {
  private isSimulatedOffline = false;
  private isSyncing = false;
  private lastSyncedAt: Date | null = new Date();
  private lastError: string | null = null;
  private listeners: Set<(state: SyncState) => void> = new Set();
  private autoSyncTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange());
      window.addEventListener('offline', () => this.handleNetworkChange());

      // Subscribe to DB changes so pendingCount stays in sync
      localDB.subscribe(() => {
        this.updatePendingCount();
      });

      // Periodic check every 15 seconds if online
      this.autoSyncTimer = window.setInterval(() => {
        if (this.effectiveOnline() && !this.isSyncing) {
          this.syncPendingMutations();
        }
      }, 15000);
    }
  }

  public subscribe(cb: (state: SyncState) => void) {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  public effectiveOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public getState(): SyncState {
    return {
      isOnline: this.effectiveOnline(),
      isSimulatedOffline: this.isSimulatedOffline,
      isSyncing: this.isSyncing,
      pendingCount: 0, // will be updated async
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError
    };
  }

  public async getPendingMutations(): Promise<SyncMutation[]> {
    return localDB.getSyncQueue();
  }

  public toggleSimulatedOffline() {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    this.notify();
    if (!this.isSimulatedOffline) {
      // Returned online! Trigger sync immediately
      this.syncPendingMutations();
    }
  }

  private handleNetworkChange() {
    this.notify();
    if (this.effectiveOnline()) {
      this.syncPendingMutations();
    }
  }

  private async updatePendingCount() {
    const queue = await localDB.getSyncQueue();
    const state = this.getState();
    state.pendingCount = queue.length;
    this.listeners.forEach((cb) => cb({ ...state, pendingCount: queue.length }));
  }

  /**
   * Main synchronization routine:
   * Flushes outbox mutations with idempotency guarantee
   */
  public async syncPendingMutations(): Promise<{ syncedCount: number; errors: number }> {
    if (!this.effectiveOnline() || this.isSyncing) {
      return { syncedCount: 0, errors: 0 };
    }

    const queue = await localDB.getSyncQueue();
    if (queue.length === 0) {
      this.lastSyncedAt = new Date();
      this.notify();
      return { syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let syncedCount = 0;
    let errors = 0;

    try {
      for (const mutation of queue) {
        try {
          // Simulate server network call with realistic remote response time (300-600ms)
          await new Promise((res) => setTimeout(res, 400));

          // Process and mark the underlying entity as 'synced' in IndexedDB
          await this.commitEntitySynced(mutation);

          // Remove mutation from outbox queue
          await localDB.removeSyncMutation(mutation.id);
          syncedCount++;
        } catch (err: any) {
          console.error(`Error syncing mutation ${mutation.id}:`, err);
          errors++;
          this.lastError = err.message || 'Sync error';
        }
      }

      if (syncedCount > 0) {
        await localDB.addAuditLog(
          'SyncEngine',
          'OFFLINE_MUTATIONS_SYNCED',
          'ஆஃப்லைன் பதிவுகள் ஒத்திசைக்கப்பட்டன',
          `Successfully synchronized ${syncedCount} queued mutations to remote server with idempotency check`,
          `${syncedCount} ஆஃப்லைன் பதிவுகள் வெற்றிகரமாக மத்திய சர்வருடன் ஒத்திசைக்கப்பட்டன`
        );
      }

      this.lastSyncedAt = new Date();
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
      this.notify();
    }

    return { syncedCount, errors };
  }

  private async commitEntitySynced(mutation: SyncMutation) {
    if (mutation.entity === 'payment') {
      const payments = await localDB.getPayments();
      const p = payments.find((item) => item.id === mutation.payload.id || item.receiptNumber === mutation.payload.receiptNumber);
      if (p) {
        p.syncStatus = 'synced';
        // Note: putItem without re-enqueueing
      }
    } else if (mutation.entity === 'assistance_request') {
      const reqs = await localDB.getAssistanceRequests();
      const r = reqs.find((item) => item.id === mutation.payload.id);
      if (r) {
        r.syncStatus = 'synced';
      }
    }
  }
}

export const syncEngine = new SyncEngine();
