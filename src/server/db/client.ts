import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

let cachedPool: Pool | null = null;
let cachedDb: NodePgDatabase<typeof schema> | null = null;

const BOOTSTRAP_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "godowns" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "manager" text NOT NULL,
  "capacity_units" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "contact_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "city" text NOT NULL,
  "gstin" text NOT NULL,
  "lead_time_days" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "contact_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "city" text NOT NULL,
  "gstin" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "items" (
  "id" text PRIMARY KEY,
  "sku" text NOT NULL UNIQUE,
  "hsn_code" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL,
  "unit" text NOT NULL,
  "cost_price" numeric(12, 2) NOT NULL,
  "selling_price" numeric(12, 2) NOT NULL,
  "gst_rate" integer NOT NULL,
  "min_level" integer NOT NULL,
  "preferred_supplier_id" text NOT NULL REFERENCES "suppliers"("id")
);

CREATE TABLE IF NOT EXISTS "stock_levels" (
  "item_id" text NOT NULL REFERENCES "items"("id"),
  "godown_id" text NOT NULL REFERENCES "godowns"("id"),
  "qty" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("item_id", "godown_id")
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" text PRIMARY KEY,
  "po_number" text NOT NULL UNIQUE,
  "supplier_id" text NOT NULL REFERENCES "suppliers"("id"),
  "godown_id" text NOT NULL REFERENCES "godowns"("id"),
  "order_date" timestamptz NOT NULL,
  "expected_date" timestamptz NOT NULL,
  "received_date" timestamptz,
  "status" text NOT NULL,
  "subtotal" numeric(14, 2) NOT NULL,
  "cgst_total" numeric(14, 2) NOT NULL,
  "sgst_total" numeric(14, 2) NOT NULL,
  "gst_total" numeric(14, 2) NOT NULL,
  "grand_total" numeric(14, 2) NOT NULL,
  "notes" text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id" text PRIMARY KEY,
  "purchase_order_id" text NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL REFERENCES "items"("id"),
  "qty" integer NOT NULL,
  "unit_cost" numeric(12, 2) NOT NULL,
  "gst_rate" integer NOT NULL,
  "taxable_amount" numeric(14, 2) NOT NULL,
  "gst_amount" numeric(14, 2) NOT NULL,
  "line_total" numeric(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" text PRIMARY KEY,
  "invoice_number" text NOT NULL UNIQUE,
  "customer_id" text NOT NULL REFERENCES "customers"("id"),
  "godown_id" text NOT NULL REFERENCES "godowns"("id"),
  "order_date" timestamptz NOT NULL,
  "fulfilled_date" timestamptz,
  "cancelled_date" timestamptz,
  "status" text NOT NULL,
  "payment_status" text NOT NULL,
  "subtotal" numeric(14, 2) NOT NULL,
  "cgst_total" numeric(14, 2) NOT NULL,
  "sgst_total" numeric(14, 2) NOT NULL,
  "gst_total" numeric(14, 2) NOT NULL,
  "grand_total" numeric(14, 2) NOT NULL,
  "notes" text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS "sales_order_lines" (
  "id" text PRIMARY KEY,
  "sales_order_id" text NOT NULL REFERENCES "sales_orders"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL REFERENCES "items"("id"),
  "qty" integer NOT NULL,
  "unit_price" numeric(12, 2) NOT NULL,
  "gst_rate" integer NOT NULL,
  "taxable_amount" numeric(14, 2) NOT NULL,
  "gst_amount" numeric(14, 2) NOT NULL,
  "line_total" numeric(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" text PRIMARY KEY,
  "item_id" text NOT NULL REFERENCES "items"("id"),
  "godown_id" text NOT NULL REFERENCES "godowns"("id"),
  "type" text NOT NULL,
  "qty_delta" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "reference_type" text NOT NULL,
  "reference_id" text NOT NULL,
  "reference_number" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" text PRIMARY KEY,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "reference_type" text,
  "reference_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
`;

export function hasDatabaseUrl(): boolean {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return false;
  if (!/^postgres(ql)?:\/\//i.test(raw)) return false;
  if (/user:password@host|MY_DATABASE_URL/i.test(raw)) return false;
  return true;
}

function getOrCreatePool(): Pool {
  if (!hasDatabaseUrl()) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!cachedPool) {
    cachedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 3_000,
    });
    cachedPool.on('error', () => {
      // Handled gracefully during query/probe lifecycle
    });
  }
  return cachedPool;
}

export function getPgDb(): NodePgDatabase<typeof schema> {
  const pool = getOrCreatePool();
  if (!cachedDb) {
    cachedDb = drizzle(pool, { schema });
  }
  return cachedDb;
}

export async function probePostgresReady(): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  try {
    const pool = getOrCreatePool();
    await pool.query('SELECT 1');
    const check = await pool.query<{ tbl: string | null }>(
      `SELECT to_regclass('public.godowns') AS tbl`,
    );
    if (!check.rows[0]?.tbl) {
      await pool.query(BOOTSTRAP_SCHEMA_SQL);
    }
    return true;
  } catch {
    if (cachedPool) {
      await cachedPool.end().catch(() => {});
      cachedPool = null;
      cachedDb = null;
    }
    return false;
  }
}
