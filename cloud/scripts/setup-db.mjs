import { readFile } from 'node:fs/promises';
import { Pool } from '@neondatabase/serverless';
if (!process.env.DHUN_DATABASE_URL) throw Error('The provisioned Dhun account database is not configured.');
const pool = new Pool({ connectionString: process.env.DHUN_DATABASE_URL });
try {
  await pool.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
  console.log('Dhun schema and per-user access policies applied to the provisioned account database.');
} finally { await pool.end(); }
