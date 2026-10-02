import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { db, sql } from "./db/client.js";
import { bookingsService } from "./modules/bookings/service.js";
import { logger } from "./lib/logger.js";

const app = createApp({
  checkDb: async () => {
    await sql`select 1`;
    return true;
  },
});

// Releases holds whose payment window passed. Also done lazily on every new booking; this keeps the
// agenda and "Mis turnos" honest even when nobody books for a while.
const sweeper = setInterval(() => {
  bookingsService(db)
    .expireHolds()
    .then((n) => n && logger.info({ expired: n }, "Released expired holds"))
    .catch((err) => logger.error({ err }, "Hold sweeper failed"));
}, 60_000);
sweeper.unref();

const server = app.listen(env.PORT, () => {
  logger.info(`API escuchando en http://localhost:${env.PORT}`);
  logger.info(env.MP_ACCESS_TOKEN ? "Pagos: Mercado Pago" : "Pagos: checkout simulado (sin MP_ACCESS_TOKEN)");
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Cerrando servidor");
  clearInterval(sweeper);
  server.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
