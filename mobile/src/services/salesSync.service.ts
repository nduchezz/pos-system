import api from '../api/client';
import { pendingSalesRepo, productsRepo } from '../database';

export interface SalesSyncResult {
  total: number;
  synced: number;
  failed: number;
  dropped: number;
  durationMs: number;
}

export const salesSync = {
  /**
   * Sync all pending sales to the server, oldest first.
   * - 2xx → mark synced
   * - 4xx → drop (bad data, can't be retried)
   * - 5xx / network → keep pending, retry later
   */
  async syncPending(): Promise<SalesSyncResult> {
    const start = Date.now();
    const result: SalesSyncResult = {
      total: 0,
      synced: 0,
      failed: 0,
      dropped: 0,
      durationMs: 0,
    };

    const pending = await pendingSalesRepo.getPending();
    result.total = pending.length;

    if (pending.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    for (const sale of pending) {
      try {
        await pendingSalesRepo.markSyncing(sale.clientTransactionId);

        const payload = JSON.parse(sale.payloadJson);
        const res = await api.post('/sales', payload);
        const serverReceiptNo = res.data?.data?.sale?.receiptNo || 'N/A';

        await pendingSalesRepo.markSynced(sale.clientTransactionId, serverReceiptNo);
        result.synced++;

        // Refresh local stock for products in this sale (server is source of truth)
        // Optional: we already decremented locally, server did too. No action needed.
      } catch (err: any) {
        const status = err.response?.status;

        if (status && status >= 400 && status < 500) {
          // Client error (validation, insufficient stock, etc.) — drop, don't retry
          console.warn(
            `Dropping sale ${sale.localReceiptNo}: ${err.response?.data?.message}`
          );
          await pendingSalesRepo.markFailed(
            sale.clientTransactionId,
            err.response?.data?.message || 'Validation error'
          );
          result.dropped++;
        } else {
          // Network / server error — keep pending
          await pendingSalesRepo.markFailed(
            sale.clientTransactionId,
            err.message || 'Network error'
          );
          result.failed++;
        }
      }
    }

    result.durationMs = Date.now() - start;
    return result;
  },

  /**
   * Count of sales waiting to sync.
   */
  async pendingCount(): Promise<number> {
    return pendingSalesRepo.countPending();
  },

  /**
   * Clear synced sales from local DB (housekeeping).
   */
  async clearSynced(): Promise<void> {
    await pendingSalesRepo.clearSynced();
  },
};
