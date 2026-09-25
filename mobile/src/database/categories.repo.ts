
import { getDb } from './db';
import { Category } from '../api/categories.api';

interface CategoryRow {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  status: number;
  syncedAt: string;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    description: row.description || undefined,
    status: row.status === 1,
    createdAt: row.syncedAt,
    updatedAt: row.syncedAt,
  };
}

export const categoriesRepo = {
  async replaceAll(categories: Category[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

       await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM categories');
      for (const c of categories) {
        await txn.runAsync(
          `INSERT INTO categories (id, businessId, name, description, status, syncedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.businessId, c.name, c.description || null, c.status ? 1 : 0, now]
        );
      }
    });
  },

  async getAll(): Promise<Category[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories WHERE status = 1 ORDER BY name ASC'
    );
    return rows.map(rowToCategory);
  },

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    return row?.count ?? 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM categories');
  },
};
