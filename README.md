# moneysplit — by ReflectAI

A Splitwise-style expense-sharing web app. Black & olive (`#808000`) theme, mobile-first, responsive, with proper dark/light mode.

## Features

- **Quick signup** — 3 fields (name, email, password), JWT auth
- **Groups** — create, list, invite friends via shareable link
- **Invite links** — generate/copy/share; accept requires a logged-in account (with quick signup inline)
- **Expenses** — add with description, amount, payer, date, category
- **Split types** — equal, custom amounts, percentages
- **Balances** — per-member net balance in each group
- **Who owes whom** — minimal debt simplification
- **Settle up** — record payments to zero out debts
- **Dark/light mode** — olive & black theme, persisted preference

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + Knex |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |

## Monorepo Layout

```
moneysplit/
├── client/     # Vite React TS app (Tailwind, olive/black theme)
├── server/     # Express + Knex API
│   └── src/db/ # migrations, seeds, knexfile
└── shared/     # shared TypeScript types
```

## Prerequisites

- Node.js 18+
- PostgreSQL running locally

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure the database**
   Create a Postgres database and set env vars. Copy the example:
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with your Postgres credentials (defaults: `postgres`/`postgres` on `localhost:5432`, db `moneysplit`).

3. **Create the database** (once)
   ```bash
   createdb moneysplit
   ```

4. **Run migrations & seed**
   ```bash
   npm run migrate
   npm run seed
   ```
   Seed creates a **superadmin** (`admin@reflectai.in`) and demo users (`alice@example.com`, `bob@example.com`, `carol@example.com`) — all with password `password123`.

5. **Start the dev servers** (client on :5173, server on :4000)
   ```bash
   npm run dev
   ```
   Open http://localhost:5173

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run client + server concurrently |
| `npm run dev:server` | Server only |
| `npm run dev:client` | Client only |
| `npm run build` | Build all packages |
| `npm run migrate` | Run DB migrations |
| `npm run seed` | Seed demo data |

## API Overview

```
POST /api/auth/register        POST /api/auth/login        GET /api/auth/me
GET  /api/groups               POST /api/groups            GET /api/groups/:id
POST /api/groups/:id/invite    POST /api/groups/join
GET  /api/groups/:id/balances
GET  /api/expenses/:groupId    POST /api/expenses/:groupId
POST /api/expenses/:groupId/settle
GET  /api/expenses/:groupId/settlements
```


## Docker

Run the entire stack (Postgres + API + web) with Docker Compose:

```bash
# Set a strong JWT secret (required in production)
export JWT_SECRET="$(openssl rand -hex 32)"

# Build and start all services
docker compose up --build -d
```

Services:
- **client** → http://localhost (nginx, SPA + API proxy)
- **server** → http://localhost:4000 (Express API)
- **db** → Postgres 16 on :5432

Migrations and seed data run automatically on server startup. To stop:

```bash
docker compose down
```

To reset the database volume:

```bash
docker compose down -v
```

## Security

- **Helmet** sets secure HTTP headers (CSP, X-Frame-Options, etc.)
- **Rate limiting** — 100 req/15min per IP globally; 10 req/15min on auth endpoints (brute-force protection)
- **Input validation** on all routes via `express-validator` (UUIDs, lengths, amounts)
- **bcrypt** password hashing with cost factor 12
- **JWT** signed with issuer/audience, 7-day expiry; server refuses to run with the default dev secret in production
- **Strict CORS** — only the configured `CLIENT_URL` origin is allowed
- **Generic auth errors** to prevent user enumeration
- **Request body size limit** (100kb)
- **Security headers** on nginx (X-Frame-Options, nosniff, Referrer-Policy, XSS-Protection)

### Production checklist

1. Set a strong `JWT_SECRET` (never the default)
2. Set `NODE_ENV=production`
3. Set `CLIENT_URL` to your real domain
4. Use strong Postgres credentials
5. Terminate TLS at your reverse proxy (nginx/cloud provider)


## Superadmin

A seeded superadmin account is created on `npm run seed`:

- **Email:** `admin@reflectai.in`
- **Password:** `password123`

Superadmins have a `role: 'superadmin'` on their user record and can access admin-only endpoints:

```
GET /api/admin/users     # list all users
GET /api/admin/groups    # list all groups
```

These endpoints are protected by `requireSuperAdmin` middleware (after `requireAuth`). Regular users get a `403 Forbidden` response. To promote a user to superadmin, update their `role` in the database.

## Roadmap

- Import/export expenses (CSV)
- Recurring expenses
- Group settings & member management
- Notifications
