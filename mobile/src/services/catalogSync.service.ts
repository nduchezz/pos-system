import { productsApi } from '../api/products.api';
import { categoriesApi } from '../api/categories.api';
import { customersApi } from '../api/customers.api';
import { productsRepo, categoriesRepo, customersRepo, syncMetaRepo, SYNC_KEYS } from '../database';

export interface CatalogSyncResult {
  products: number;
  categories: number;
  customers: number;
  durationMs: number;
  error?: string;
}

export const catalogSync = {
  /**
   * Download the full catalog from the API and replace the local cache.
   * Called on: app start (online), after login, manual pull-to-refresh.
   */
  async fullSync(): Promise<CatalogSyncResult> {
    const start = Date.now();
    const result: CatalogSyncResult = {
      products: 0,
      categories: 0,
      customers: 0,
      durationMs: 0,
    };

    try {
      // Fetch everything in parallel
      const [products, categories, customers] = await Promise.all([
        productsApi.list({}),
        categoriesApi.list(),
        customersApi.list({}),
      ]);

           // Replace local cache — SEQUENTIAL to avoid nested SQLite transactions
      await productsRepo.replaceAll(products);
      await categoriesRepo.replaceAll(categories);
      await customersRepo.replaceAll(customers);

      // Record sync time
      await syncMetaRepo.set(SYNC_KEYS.lastCatalogSync, new Date().toISOString());

      result.products = products.length;
      result.categories = categories.length;
      result.customers = customers.length;
    } catch (err: any) {
      console.warn('Catalog sync failed:', err.message);
      result.error = err.response?.data?.message || err.message || 'Sync failed';
    }

    result.durationMs = Date.now() - start;
    return result;
  },

  /**
   * Get the last successful sync timestamp.
   */
  async getLastSync(): Promise<Date | null> {
    return syncMetaRepo.getDate(SYNC_KEYS.lastCatalogSync);
  },

  /**
   * Check if the cache is fresh (within N minutes).
   */
  async isFresh(maxAgeMinutes: number = 30): Promise<boolean> {
    const last = await this.getLastSync();
    if (!last) return false;
    const ageMs = Date.now() - last.getTime();
    return ageMs < maxAgeMinutes * 60 * 1000;
  },
};
