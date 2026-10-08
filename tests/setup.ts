import { config } from "dotenv";
import path from "node:path";

// Load the test environment BEFORE any test file imports `@/server/db`,
// so the DB pool is created against `accounting_test`, never the dev DB.
config({ path: path.resolve(__dirname, "../.env.test"), override: true });

if (!process.env.DATABASE_URL?.includes("accounting_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not point at accounting_test. " +
      "Check .env.test — tests truncate all tables between runs and must never " +
      "run against a development or production database."
  );
}
