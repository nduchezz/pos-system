import { getDb } from './db';

export type PendingSaleStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface PendingSale {
  id: string;
  clientTransactionId: string;
  payloadJson: string;
  localReceiptNo: string;
  total: number;
  status: PendingSaleStatus;
  retries: number;
  lastError: string | null;
  createdAt: string;
  syncedAt: string | null;
  serverReceiptNo: string | null;
}

interface PendingSaleRow {
  id: string;
  clientTransactionId: string;
  payloadJson: string;
  localReceiptNo: string;
  total: number;
  status: string;
  retries: number;
  lastError: string | null;
  createdAt: string;
  syncedAt: string | null;
  serverReceiptNo: string | null;
}

function rowToPending(row: PendingSaleRow): PendingSale {
  return {
    ...row,
    status: row.status as PendingSaleStatus,
  };
}

export const pendingSalesRepo = {
  async insert(sale: Omit<PendingSale, 'id' | 'retries' | 'lastError' | 'syncedAt' | 'serverReceiptNo' | 'status'>): Promise<PendingSale> {
    const db = await getDb();
    const id = sale.clientTransactionId; // Use TX ID as primary key
    await db.runAsync(
      `INSERT INTO pending_sales (
        id, clientTransactionId, payloadJson, localReceiptNo,
        total, status, retries, createdAt
      ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [id, sale.clientTransactionId, sale.payloadJson, sale.localReceiptNo, sale.total, sale.createdAt]
    );
    return {
      ...sale,
      id,
      status: 'pending',
      retries: 0,
      lastError: null,
      syncedAt: null,
      serverReceiptNo: null,
    };
  },

  async getAll(): Promise<PendingSale[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<PendingSaleRow>(
      'SELECT * FROM pending_sales ORDER BY createdAt ASC'
    );
    return rows.map(rowToPending);
  },

  async getPending(): Promise<PendingSale[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<PendingSaleRow>(
      `SELECT * FROM pending_sales
       WHERE status IN ('pending', 'failed')
       ORDER BY createdAt ASC`
    );
    return rows.map(rowToPending);
  },

  async countPending(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM pending_sales
       WHERE status IN ('pending', 'failed')`
    );
    return row?.count ?? 0;
  },

  async markSyncing(clientTransactionId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales SET status = 'syncing' WHERE clientTransactionId = ?`,
      [clientTransactionId]
    );
  },

  async markSynced(clientTransactionId: string, serverReceiptNo: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales
       SET status = 'synced', syncedAt = ?, serverReceiptNo = ?
       WHERE clientTransactionId = ?`,
      [new Date().toISOString(), serverReceiptNo, clientTransactionId]
    );
  },

  async markFailed(clientTransactionId: string, errorMessage: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE pending_sales
       SET status = 'failed', retries = retries + 1, lastError = ?
       WHERE clientTransactionId = ?`,
      [errorMessage, clientTransactionId]
    );
  },

  async remove(clientTransactionId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'DELETE FROM pending_sales WHERE clientTransactionId = ?',
      [clientTransactionId]
    );
  },

  async clearSynced(): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM pending_sales WHERE status = 'synced'");
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM pending_sales');
  },
};
