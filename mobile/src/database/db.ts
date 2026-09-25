import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
  -- Products cache
  CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY NOT NULL,
    businessId      TEXT NOT NULL,
    categoryId      TEXT,
    supplierId      TEXT,
    name            TEXT NOT NULL,
    sku             TEXT NOT NULL,
    barcode         TEXT,
    description     TEXT,
    buyingPrice     REAL NOT NULL DEFAULT 0,
    sellingPrice    REAL NOT NULL DEFAULT 0,
    stockQuantity   INTEGER NOT NULL DEFAULT 0,
    minStock        INTEGER NOT NULL DEFAULT 5,
    unit            TEXT NOT NULL DEFAULT 'PIECE',
    image           TEXT,
    status          INTEGER NOT NULL DEFAULT 1,
    categoryName    TEXT,
    supplierName    TEXT,
    syncedAt        TEXT NOT NULL,
    updatedAt       TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_business ON products(businessId);
  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

  -- Categories cache
  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY NOT NULL,
    businessId  TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    status      INTEGER NOT NULL DEFAULT 1,
    syncedAt    TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(businessId);

  -- Customers cache
  CREATE TABLE IF NOT EXISTS customers (
    id                  TEXT PRIMARY KEY NOT NULL,
    businessId          TEXT NOT NULL,
    name                TEXT NOT NULL,
    phone               TEXT,
    email               TEXT,
    address             TEXT,
    creditLimit         REAL NOT NULL DEFAULT 0,
    outstandingBalance  REAL NOT NULL DEFAULT 0,
    syncedAt            TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(businessId);
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

  -- Pending sales queue
  CREATE TABLE IF NOT EXISTS pending_sales (
    id                     TEXT PRIMARY KEY NOT NULL,
    clientTransactionId    TEXT UNIQUE NOT NULL,
    payloadJson            TEXT NOT NULL,
    localReceiptNo         TEXT NOT NULL,
    total                  REAL NOT NULL,
    status                 TEXT NOT NULL DEFAULT 'pending',
    retries                INTEGER NOT NULL DEFAULT 0,
    lastError              TEXT,
    createdAt              TEXT NOT NULL,
    syncedAt               TEXT,
    serverReceiptNo        TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_sales(status);
  CREATE INDEX IF NOT EXISTS idx_pending_createdAt ON pending_sales(createdAt);

  -- Sync metadata (last sync timestamps)
  CREATE TABLE IF NOT EXISTS sync_meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (openingPromise) return openingPromise;

  openingPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('pos_offline.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync(SCHEMA);
    dbInstance = db;
    return db;
  })();

  return openingPromise;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS pending_sales;
    DROP TABLE IF EXISTS sync_meta;
  `);
  dbInstance = null;
  initPromise = null;
}

export const SYNC_KEYS = {
  lastCatalogSync: 'last_catalog_sync',
  lastSalesSync: 'last_sales_sync',
};
