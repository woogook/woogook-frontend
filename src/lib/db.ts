import { Pool } from "pg";

type GlobalWithPg = typeof globalThis & { pgPool?: Pool };

const globalForPg = globalThis as GlobalWithPg;

export const pool =
  globalForPg.pgPool ||
  new Pool({
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

if (!globalForPg.pgPool) {
  globalForPg.pgPool = pool;
}
