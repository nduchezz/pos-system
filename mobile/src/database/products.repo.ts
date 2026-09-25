import { getDb } from './db';
import { Product, Unit } from '../api/products.api';

interface ProductRow {
  id: string;
  businessId: string;
  categoryId: string | null;
  supplierId: string | null;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock: number;
  unit: string;
  image: string | null;
  status: number;
  categoryName: string | null;
  supplierName: string | null;
  syncedAt: string;
  updatedAt: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    businessId: row.businessId,
    categoryId: row.categoryId,
    supplierId: row.supplierId,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    buyingPrice: row.buyingPrice,
    sellingPrice: row.sellingPrice,
    stockQuantity: row.stockQuantity,
    minStock: row.minStock,
    unit: row.unit as Unit,
    image: row.image,
    status: row.status === 1,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
    category: row.categoryName ? { id: row.categoryId || '', name: row.categoryName } : null,
    supplier: row.supplierName ? { id: row.supplierId || '', name: row.supplierName } : null,
  };
}

export const productsRepo = {
  // Replace entire catalog (called after successful API fetch)
  async replaceAll(products: Product[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

        await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM products');
      for (const p of products) {
               await txn.runAsync(
          `INSERT INTO products (
            id, businessId, categoryId, supplierId, name, sku, barcode,
            description, buyingPrice, sellingPrice, stockQuantity, minStock,
            unit, image, status, categoryName, supplierName, syncedAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.businessId,
            p.categoryId || null,
            p.supplierId || null,
            p.name,
            p.sku,
            p.barcode || null,
            p.description || null,
            p.buyingPrice,
            p.sellingPrice,
            p.stockQuantity,
            p.minStock,
            p.unit,
            p.image || null,
            p.status ? 1 : 0,
            p.category?.name || null,
            p.supplier?.name || null,
            now,
            p.updatedAt || now,
          ]
        );
      }
    });
  },

  async getAll(): Promise<Product[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ProductRow>(
      'SELECT * FROM products WHERE status = 1 ORDER BY name ASC'
    );
    return rows.map(rowToProduct);
  },

  async search(query: string): Promise<Product[]> {
    const db = await getDb();
    const q = `%${query.toLowerCase()}%`;
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM products
       WHERE status = 1
         AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR barcode LIKE ?)
       ORDER BY name ASC`,
      [q, q, `%${query}%`]
    );
    return rows.map(rowToProduct);
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ProductRow>(
      'SELECT * FROM products WHERE categoryId = ? AND status = 1 ORDER BY name ASC',
      [categoryId]
    );
    return rows.map(rowToProduct);
  },

  async getById(id: string): Promise<Product | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<ProductRow>(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return row ? rowToProduct(row) : null;
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<ProductRow>(
      'SELECT * FROM products WHERE barcode = ? LIMIT 1',
      [barcode]
    );
    return row ? rowToProduct(row) : null;
  },

  // Decrement local stock after an offline sale
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ?',
      [quantity, productId]
    );
  },

  // Increment local stock (for refunds / stock additions)
  async incrementStock(productId: string, quantity: number): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?',
      [quantity, productId]
    );
  },

  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM products'
    );
    return row?.count ?? 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM products');
  },
};
