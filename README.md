# Numerito

Plataforma de turnos online para negocios locales: reservas 24/7, seña con Mercado Pago, recordatorios automáticos y agenda para el negocio.

> Estado: **Fase 2** — landing, cuentas, panel con servicios, barberos, horarios y bloqueos, y página pública de la barbería. Próximo: disponibilidad y reserva.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS, shadcn/ui |
| API | Express 5, TypeScript, zod |
| Base de datos | PostgreSQL 16, Drizzle ORM |
| Auth | Better Auth (organizaciones = barberías) |
| Pagos | Mercado Pago *(fase 4)* |
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

