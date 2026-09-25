import { getDb } from './db';
import { Customer } from '../api/customers.api';

interface CustomerRow {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
  outstandingBalance: number;
  syncedAt: string;
}

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    creditLimit: row.creditLimit,
    outstandingBalance: row.outstandingBalance,
    status: true,
    createdAt: row.syncedAt,
    updatedAt: row.syncedAt,
  };
}

export const customersRepo = {
  async replaceAll(customers: Customer[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

       await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM customers');
      for (const c of customers) {
        await txn.runAsync(
          `INSERT INTO customers (
            id, businessId, name, phone, email, address,
            creditLimit, outstandingBalance, syncedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id, c.businessId, c.name,
            c.phone || null, c.email || null, c.address || null,
            c.creditLimit, c.outstandingBalance, now,
          ]
        );
      }
    });
  },

  async getAll(): Promise<Customer[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CustomerRow>(
      'SELECT * FROM customers ORDER BY name ASC'
    );
    return rows.map(rowToCustomer);
  },

  async search(query: string): Promise<Customer[]> {
    const db = await getDb();
    const q = `%${query.toLowerCase()}%`;
    const rows = await db.getAllAsync<CustomerRow>(
      `SELECT * FROM customers
       WHERE LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ?
       ORDER BY name ASC`,
      [q, `%${query}%`, q]
    );
    return rows.map(rowToCustomer);
  },

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM customers'
    );
    return row?.count ?? 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM customers');
  },
};
