# moneysplit — by ReflectAI

A Splitwise-style expense-sharing web app. Black & olive (`#808000`) theme, mobile-first, responsive, dark/light mode.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + Knex (query builder) + PostgreSQL
- **Auth:** Email/password, JWT (access token), bcrypt password hashing
- **Monorepo:** single repo with `client/`, `server/`, `shared/` packages

## Repo Layout

```
moneysplit/
├── client/                 # Vite React TS app
│   ├── src/
│   │   ├── api/            # fetch layer (typed API client)
│   │   ├── components/     # reusable UI (Button, Card, Modal, ThemeToggle...)
│   │   ├── pages/          # Login, Signup, Dashboard, GroupDetail, ...
│   │   ├── hooks/          # useAuth, useTheme, useGroups, ...
│   │   ├── lib/            # utils, currency, split math helpers
│   │   ├── styles/         # Tailwind + theme tokens
│   │   └── App.tsx
│   └── tailwind.config.js  # olive/black palette + dark mode
├── server/
│   ├── src/
│   │   ├── db/             # knex config + migrations + seeds
│   │   ├── routes/         # auth, groups, expenses, settlements, invites
│   │   ├── middleware/     # auth (JWT verify), error handler
│   │   ├── services/       # balance engine, split logic
│   │   └── index.ts        # app entry
│   └── knexfile.ts
├── shared/                 # shared TS types (User, Group, Expense, Split...)
└── package.json            # root scripts (dev, migrate, seed)
```

## Data Model (Postgres)

- **users** — id, email (unique), name, password_hash, created_at
- **groups** — id, name, description, created_by, created_at
- **group_members** — id, group_id, user_id, joined_at (unique group+user)
- **expenses** — id, group_id, paid_by (user), amount (numeric), description, category, date, created_at
- **expense_splits** — id, expense_id, user_id, share_amount, share_type (equal/custom/percent)
- **settlements** — id, group_id, from_user, to_user, amount, note, settled_at
- **invite_tokens** — id, group_id, token (uuid), created_by, expires_at, used

## Core Features

### 1. Auth
- Register (name, email, password) — "quick signup" keeps it to 3 fields.
- Login → JWT stored in memory/localStorage.
- Protected routes via middleware; frontend route guards.

### 2. Groups
- Create group (name + optional description).
- List my groups on dashboard.
- Generate invite link (uuid token) → shareable URL.
- Join group via invite link (requires logged-in account; token consumed on accept).

### 3. Expenses
- Add expense: description, amount, paid_by, date, category, split type.
- Split types: **equal**, **custom amounts**, **percentages**.
- List expenses per group with payer + per-member share.

### 4. Balances & Settle Up
- Balance engine: for each group, compute net balance per member.
- Simplify debts to minimal "who owes whom" transfers.
- Record a settlement to zero out a debt.

### 5. Invite Links
- Generate/copy/share link from group settings.
- Accept flow: if logged in → join; if not → prompt quick signup then join.

## Theme (Black & Olive)

- **Olive:** `#808000` as primary accent.
- **Black:** `#0a0a0a` / `#111` surfaces.
- **Light mode:** off-white backgrounds, olive accents, near-black text.
- **Dark mode:** black backgrounds, olive accents, light text.
- Tailwind `darkMode: 'class'` + `ThemeToggle` persisting to localStorage.
- Olive palette tokens: `olive-50 … olive-900` derived from `#808000`.

## API Endpoints (REST)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
POST   /api/groups/:id/invite          → { token, url }
POST   /api/groups/join                → { inviteToken }

GET    /api/groups/:id/expenses
POST   /api/groups/:id/expenses
GET    /api/groups/:id/balances
POST   /api/groups/:id/settle
```

## Build Order (todos)

1. Scaffold monorepo (client + server + shared) with Vite React TS + Tailwind and Node/Knex
2. Postgres schema & Knex migrations (users, groups, group_members, expenses, expense_splits, settlements, invite_tokens)
3. Backend auth (register/login, JWT, bcrypt, middleware)
4. Groups API (create, list, invite link generation, join via invite)
5. Expenses API (create with split logic, list)
6. Settlements / balance calculation engine (who owes whom)
7. Frontend auth screens (login/signup) with quick signup flow
8. Dashboard (groups list, balances overview)
9. Group detail view (members, expenses, balances, settle up)
10. Add-expense flow (split equally/custom/percentages)
11. Invite link UI (generate, copy, share, accept)
12. Black & olive theme with proper dark/light mode toggle
13. Responsive mobile-first layout across all screens
14. Wire frontend to backend API (fetch layer, state management)
15. Seed data + end-to-end smoke test
16. README with setup instructions

## UX Principles

- Mobile-first: bottom nav / large touch targets on mobile, sidebar on desktop.
- No redundant text — concise labels, clear empty states.
- One primary action per screen (e.g., big "+ Add expense").
- Instant feedback (toasts) on actions like copy invite link, settle up.
