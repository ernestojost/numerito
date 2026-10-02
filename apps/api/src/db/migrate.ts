import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// Only needs the database URL, so it can run before the rest of the env is configured (CI, first deploy).
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

await migrate(drizzle(sql), { migrationsFolder });
console.log("Migrations applied");
await sql.end();
