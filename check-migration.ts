import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(
    `select column_name from information_schema.columns where table_name = 'users' and column_name = 'is_super_admin'`
  );
  console.log(res.rows.length ? "Migration applied ✅" : "Migration NOT applied ❌");
  await pool.end();
}

main();