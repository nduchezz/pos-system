import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Alert, AppState } from 'react-native';
import { useNetwork } from './NetworkContext';
import { useAuth } from './AuthContext';
import { syncService } from '../services/sync.service';
import { salesSync } from '../services/salesSync.service';
import { catalogSync } from '../services/catalogSync.service';
import { pendingSalesRepo, PendingSale } from '../database';

interface SyncContextType {
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  pendingSales: PendingSale[];
  reloadPending: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  pendingCount: 0,
  syncing: false,
  lastSyncAt: null,
  syncNow: async () => {},
  refreshCatalog: async () => {},
  pendingSales: [],
  reloadPending: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();
  const { isAuthenticated } = useAuth();

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const syncingRef = useRef(false);

  // ─── Reload pending sales from SQLite ─────────────────────────────
  const reloadPending = useCallback(async () => {
    try {
      const list = await pendingSalesRepo.getPending();
      setPendingSales(list);
      setPendingCount(list.length);
    } catch (err) {
      console.warn('reloadPending failed', err);
    }
  }, []);

  // ─── Core sync worker ─────────────────────────────────────────────
  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnline) return;
    if (!isAuthenticated) return;

    syncingRef.current = true;
    setSyncing(true);

    try {
      await syncService.fullSync();
      setLastSyncAt(new Date());
      await reloadPending();
    } catch (err: any) {
      console.warn('Sync error:', err?.message);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isOnline, isAuthenticated, reloadPending]);

  // ─── Load pending on auth change ──────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        reloadPending();
      } else {
        setPendingSales([]);
        setPendingCount(0);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isAuthenticated, reloadPending]);

  // ─── Auto-sync when connection returns ────────────────────────────
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return;
    if (pendingCount === 0) return;

    const timer = setTimeout(() => {
      runSync();
    }, 200);
    return () => clearTimeout(timer);
  }, [isOnline, isAuthenticated, pendingCount, runSync]);

  // ─── Sync on app startup ──────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return;
    const timer = setTimeout(() => {
      runSync();
    }, 300);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isOnline, runSync]);

  // ─── Re-sync when app returns to foreground ───────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isOnline && isAuthenticated) {
        runSync();
      }
    });
    return () => sub.remove();
  }, [isOnline, isAuthenticated, runSync]);

  // ─── User-triggered sync ──────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline.');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return;
    }

    setSyncing(true);
    try {
      const result = await salesSync.syncPending();
      await reloadPending();

      if (result.synced > 0 || result.dropped > 0) {
        const parts: string[] = [];
        if (result.synced > 0) parts.push(`${result.synced} synced`);
        if (result.dropped > 0) parts.push(`${result.dropped} dropped`);
        if (result.failed > 0) parts.push(`${result.failed} will retry`);
        Alert.alert('Sync Complete', parts.join(', '));
      } else if (result.total === 0) {
        Alert.alert('Sync', 'Nothing to sync.');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message || 'Could not sync');
    } finally {
      setSyncing(false);
    }
  }, [isOnline, isAuthenticated, reloadPending]);

  // ─── Manual catalog refresh ───────────────────────────────────────
  const refreshCatalog = useCallback(async () => {
    if (!isOnline) return;
    await catalogSync.fullSync();
    setLastSyncAt(new Date());
  }, [isOnline]);

  return (
    <SyncContext.Provider
      value={{
        pendingCount,
        syncing,
        lastSyncAt,
        syncNow,
        refreshCatalog,
        pendingSales,
        reloadPending,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
