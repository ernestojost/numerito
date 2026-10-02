# Numerito

Plataforma de turnos online para negocios locales: reservas 24/7, seña con Mercado Pago, recordatorios automáticos y agenda para el negocio.

> Estado: **Fase 4** — reserva online con seña por Mercado Pago, retención de 10 minutos, "Mis turnos" y agenda del panel. Próximo: emails y recordatorios.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS, shadcn/ui |
| API | Express 5, TypeScript, zod |
| Base de datos | PostgreSQL 16, Drizzle ORM |
| Auth | Better Auth (organizaciones = barberías) |
| Pagos | Mercado Pago Checkout Pro (con checkout simulado para desarrollo) |
| Jobs y notificaciones | Inngest, Resend *(fase 5)* |
| Tests | Vitest, Supertest, Playwright |
| Infra | Docker, GitHub Actions, Vercel, Render, Neon |

## Estructura

```
apps/
  web/        Next.js (frontend)
  api/        Express (API REST)
packages/
  shared/     esquemas zod y tipos compartidos entre web y api
  config/     tsconfig base
```

## Desarrollo local

Requisitos: Node 22, Docker Desktop.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:up                       # Postgres + Mailpit
npm run db:migrate -w @numerito/api   # aplica migraciones
npm run db:seed                     # barbería demo en /b/don-julio
npm run dev                         # web en :3000, api en :4000
```

Cuenta demo del panel (la crea el seed): `demo@numerito.app` / `demo-numerito`.

- Web: http://localhost:3000
- API: http://localhost:4000/health
- Mailpit (emails locales): http://localhost:8025

## Pagos

La seña se cobra con **Mercado Pago Checkout Pro**. Al reservar un servicio con seña, el turno queda retenido 10 minutos (`pending_payment`) y el cliente va al checkout; el turno se confirma cuando el pago se acredita.

- **Sin credenciales** (por defecto en desarrollo) se usa un **checkout simulado**: una página propia con "aprobar" y "rechazar" que recorre el mismo flujo, sin cobrar nada. En producción solo se permite con `ALLOW_SIMULATED_PAYMENTS=true`.
- **Con Mercado Pago**: completar `MP_ACCESS_TOKEN` (usar el de prueba, `TEST-…`) y `MP_WEBHOOK_SECRET` en `apps/api/.env`.
- El pago se confirma por dos caminos que terminan en la misma función idempotente: el **webhook** (`POST /api/v1/webhooks/mercadopago`, firma `x-signature` verificada) y la **vuelta del checkout**, que consulta el pago a la API. Así funciona en local sin túnel; para probar el webhook, exponer la API (por ejemplo `cloudflared tunnel --url http://localhost:4000`) y poner esa URL en `PUBLIC_API_URL`.
- Las retenciones vencidas se liberan solas (barrido cada minuto y al reservar). Si alguien paga tarde y el horario sigue libre, se confirma; si ya lo tomó otro, el turno queda vencido y se registra para devolver la seña.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta web, api y shared en modo watch |
| `npm run build` | Build de todos los paquetes |
| `npm run lint` / `npm run typecheck` | Calidad de código |
| `npm test` | Tests de todos los paquetes |
| `npm run db:generate -w @numerito/api` | Genera una migración a partir del schema |
| `npm run db:seed` | Crea la barbería demo (`--reset` para recrearla) |

## Decisiones técnicas destacadas

- **Sin reservas superpuestas por diseño**: una *exclusion constraint* de PostgreSQL (`btree_gist` + `tstzrange`) impide a nivel de base de datos que un profesional tenga dos turnos solapados, incluso con pedidos concurrentes.
- **Sesión first-party**: Next.js reenvía `/api/*` a Express, así la cookie de sesión nunca es cross-site.
- **Contrato compartido**: web y API usan los mismos esquemas zod de `packages/shared`.

