import { getDb } from './db';

export const syncMetaRepo = {
  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)`,
      [key, value]
    );
  },

  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_meta WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  },

  async getDate(key: string): Promise<Date | null> {
    const val = await this.get(key);
    return val ? new Date(val) : null;
  },
};
