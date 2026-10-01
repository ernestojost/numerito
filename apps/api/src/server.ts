import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { sql } from "./db/client.js";
import { logger } from "./lib/logger.js";

const app = createApp({
  checkDb: async () => {
    await sql`select 1`;
    return true;
  },
});

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Cerrando servidor");
  server.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
