# Task Manager

Full-stack task dashboard: **Next.js** (static export) frontend and **Express + TypeScript + MongoDB** backend

## Repository layout

| Folder   | Role |
|----------|------|
| `server/` | REST API (`/auth`, `/tasks`) |
| `web/`    | Next.js UI |

## Prerequisites

- **Node.js** (LTS recommended)
- **MongoDB** (e.g. Atlas or local)

## 1. API server (`server/`)

```bash
cd server
npm install
```

Create **`server/.env`** 
Example:

```env
# Required
mongodb_uri=mongodb+srv://USER:PASSWORD@cluster.example.mongodb.net
JWT_SECRET=use-a-long-random-string

# Optional
PORT=4000
HOST=
MONGODB_DB=task-manager
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP) — required only if you want task notification emails
SMTP_USER=
SMTP_PASS=

# Links in emails (optional)
WEB_ORIGIN=http://localhost:3000

# MongoDB Atlas JSON Schema workaround (optional)
# MONGO_BYPASS_COLLECTION_VALIDATION=true
```

Run:

```bash
npm run dev
```

Default API URL: **http://localhost:4000** (`GET /health` for a quick check).

## 2. Web app (`web/`)

```bash
cd web
npm install
```

Create **`web/.env.local`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run:

```bash
npm run dev
```

Open **http://localhost:3000**. Production build outputs static files under `web/out` (`npm run build`).
