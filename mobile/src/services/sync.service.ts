import { catalogSync, CatalogSyncResult } from './catalogSync.service';
import { salesSync, SalesSyncResult } from './salesSync.service';

export interface FullSyncResult {
  catalog: CatalogSyncResult;
  sales: SalesSyncResult;
  durationMs: number;
}

export const syncService = {
  /**
   * Full sync: catalog + pending sales.
   * Called on: app start (online), pull-to-refresh, network reconnect.
   */
  async fullSync(): Promise<FullSyncResult> {
    const start = Date.now();

    // Order matters: sync sales first (may reference products),
    // then refresh catalog (to pick up server-side stock changes).
    const sales = await salesSync.syncPending();
    const catalog = await catalogSync.fullSync();

    return {
      catalog,
      sales,
      durationMs: Date.now() - start,
    };
  },

  /**
   * Sales-only sync (faster).
   */
  async syncSalesOnly(): Promise<SalesSyncResult> {
    return salesSync.syncPending();
  },

  /**
   * Catalog-only sync.
   */
  async syncCatalogOnly(): Promise<CatalogSyncResult> {
    return catalogSync.fullSync();
  },
};
