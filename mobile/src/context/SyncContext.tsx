import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
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

  // Reload pending list from DB
  const reloadPending = useCallback(async () => {
    try {
      const list = await pendingSalesRepo.getPending();
      setPendingSales(list);
      setPendingCount(list.length);
    } catch (err) {
      console.warn('reloadPending failed', err);
    }
  }, []);

  // Reload on mount + when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      reloadPending();
    } else {
      setPendingSales([]);
      setPendingCount(0);
    }
  }, [isAuthenticated, reloadPending]);

  // The actual sync worker — guarded against parallel runs
  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isOnline) return;
    if (!isAuthenticated) return;
  const runSync = useCallback(async () => {
    console.log('🔄 runSync called', {
      syncing: syncingRef.current,
      isOnline,
      isAuthenticated,
    });
    if (syncingRef.current) return;
    if (!isOnline) {
      console.log('⚠️ Skipping sync — offline');
      return;
    }
    if (!isAuthenticated) {
      console.log('⚠️ Skipping sync — not authenticated');
      return;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      const result = await syncService.fullSync();
      console.log('✅ Sync result:', JSON.stringify(result, null, 2));
      setLastSyncAt(new Date());
      await reloadPending();
    } catch (err: any) {
      console.log('❌ Sync error:', err.message);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isOnline, isAuthenticated, reloadPending]);

    syncingRef.current = true;
    setSyncing(true);

    try {
      await syncService.fullSync();
      setLastSyncAt(new Date());
      await reloadPending();
    } catch (err: any) {
      console.warn('Sync error:', err.message);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isOnline, isAuthenticated, reloadPending]);

  // Auto-sync when connection comes back
  useEffect(() => {
    if (isOnline && isAuthenticated && pendingCount > 0) {
      runSync();
    }
  }, [isOnline, isAuthenticated]);

  // Sync on app startup (if online + authenticated)
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Re-sync when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isOnline && isAuthenticated) {
        runSync();
      }
    });
    return () => sub.remove();
  }, [isOnline, isAuthenticated, runSync]);

  // Public: user-triggered sync
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
      const salesResult = await salesSync.syncPending();
      await reloadPending();

      if (salesResult.synced > 0 || salesResult.dropped > 0) {
        const parts = [];
        if (salesResult.synced > 0) parts.push(`${salesResult.synced} synced`);
        if (salesResult.dropped > 0) parts.push(`${salesResult.dropped} dropped`);
        if (salesResult.failed > 0) parts.push(`${salesResult.failed} will retry`);
        Alert.alert('Sync Complete', parts.join(', '));
      } else if (salesResult.total === 0) {
        Alert.alert('Sync', 'Nothing to sync.');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Could not sync');
    } finally {
      setSyncing(false);
    }
  }, [isOnline, isAuthenticated, reloadPending]);

  // Public: manual catalog refresh (pull-to-refresh)
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
