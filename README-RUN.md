# Running SiteBuilder

A PostgreSQL server and two processes (this is the PERN version: PostgreSQL,
Express, React, Node). Open two terminals (PostgreSQL is usually already
running as a background service once installed).

## 0. PostgreSQL

Install PostgreSQL and make sure it is running — on Windows that is normally
the `postgresql-x64-NN` service. Create an empty database once:

```bash
psql -U postgres -c "CREATE DATABASE sitebuilder"
```

Then put the connection string in `server/.env` (git-ignored):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/sitebuilder
```

The tables are created by the API on first start. To load the ready-made
templates into the database (so the API can serve them), run once, from `server`:
`npm run import:templates`.

## 1. API (saves sites, publishes them, collects enquiries)

```bash
cd server
npm install
npm run dev            # http://localhost:8001
```

Data is always written to the PostgreSQL database `sitebuilder`, however the API
is started (`npm run dev` at the root, `run-local.cmd`, or `server/npm run dev`).
Only tests set `SITEBUILDER_DATA`, which switches to a throwaway schema.

Sessions survive restarts: the signing secret is kept in
`server/data/.session-secret` (or set `SITEBUILDER_SECRET`).

The owner account `sharma955kapil@gmail.com` is created on startup if it is
missing, locally with the password `sitebuilder-dev` (override with `SITEBUILDER_OWNER_EMAIL` / `SITEBUILDER_OWNER_PASSWORD`).
**Forgot password?** on the sign-in page issues a 6-digit code; with no mail
service configured, the code is shown on the page and in the API console.

Easiest start: `npm run dev` in this folder runs both, and restarts either one
if it crashes.

## 2. Editor

```bash
cd client
npm install
npm run dev            # http://localhost:5200
```

## What to click

1. **http://localhost:5200** — press *Create website*
2. Answer the four steps: type of site, who you sell to, business details, contact details
3. Pick a design from the forty in the gallery
4. Edit in the builder — drag sections, change wording in **Content**, adjust size and
   colour in **Style**, add pages from the toolbar
5. Press **Publish** — you get a live address like
   `http://localhost:8001/site/sharma-coaching-classes`
6. Fill in the contact form on that published page
7. Open **Enquiries** in the editor — the message is there

## AI (optional, free)

Put one free Gemini key in `server/.env` as `GEMINI_API_KEY=...` (get it at https://aistudio.google.com/apikey) and AI works for everyone who signs in, with nothing to paste in the browser. The server checks each request, limits each account to 30 AI requests per 10 minutes (`RATE_LIMIT_AI`) and never sends the key to the browser. Without it, AI falls back to a personal key in Settings, then to ready-made templates.

## "Sign in with Google"

Off by default — the sign-in page works exactly as before until you turn it
on. To turn it on:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:5200` (and
   your published domain later, if any).
3. Copy the client id it gives you (ends in `.apps.googleusercontent.com`).
4. Put the *same* client id in two places, then restart both processes:
   - `client/.env.local` — `VITE_GOOGLE_CLIENT_ID=<the client id>`
   - `server/.env` — `GOOGLE_CLIENT_ID=<the client id>`
     (`server/.env` is loaded by the server itself on startup — see
     `server/.env.example`)

The button only appears once `VITE_GOOGLE_CLIENT_ID` is set. A Google sign-in
either finds the existing account for that email or creates one — no
password is ever stored for it, so that account signs in with Google only.

## Ports

| What | Port | Why not the usual one |
|---|---|---|
| Editor | 5200 | 5173 is taken by another project on this machine |
| API | 8001 | 8000 is taken by `2.websiteBuilder` |

Set `VITE_API_URL` in `client/.env` if the API runs anywhere else.

## Going live (everything on Vercel + hosted PostgreSQL)

Two Vercel projects from this one repo, plus a free hosted PostgreSQL database (Neon or Supabase):

| Piece | Vercel project | Root Directory |
|---|---|---|
| Editor (static site) | `peddino-ai-elementor` | `client` |
| API (Express as one serverless function) | `peddino-ai-elementor-api` | `server` |
| Data | Neon / Supabase (PostgreSQL) | — |

If the editor shows **404 NOT_FOUND**, its Root Directory is not `client`
(Settings → General → Root Directory) — Vercel then builds the repo root, which has no site.

### How the templates work in production

The ~5,500 template files (pages, CSS, JS, fonts, pictures — about 139 MB after
optimising) are **not** shipped with the editor. They live in PostgreSQL
(`template_assets`) and the gallery list lives there too (`template_catalog`).
The API serves both:

- `GET /api/templates` — the gallery list as JSON. The catalog bundled into the
  client is the fallback, so the gallery is never empty if the API is slow.
- `GET /original-templates/...` and `GET /templates/<folder>/...` — the files, at
  exactly the URLs they always had. `client/vercel.json` forwards these paths from
  the editor's domain to the API, so nothing inside a template changes: same
  relative URLs, same origin as the editor, no CORS surprises.

Files are stored as they are on disk except: pictures are re-encoded (≤ 1920 px),
text is gzipped, and `.eot` (IE-only) fonts are left out. A lookup that differs
only in letter case (`Img/A.PNG`) still finds the file — Windows never cared,
Linux does, and old templates are full of such slips. Every stored file is under
3 MB, inside Vercel's 4.5 MB function-response limit.

### Steps

1. **Database** — create a free PostgreSQL project (Neon or Supabase) and copy its
   connection string (`postgresql://USER:PASS@HOST/DB?sslmode=require`).
2. **Load the templates into the database** (once, from your machine; safe to re-run):
   ```bash
   cd server
   npm install
   set DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require      # Windows cmd
   node scripts/import-templates.mjs --dry-run     # measure first
   node scripts/import-templates.mjs               # import (~139 MB; mind the free-tier size limit)
   ```
3. **API project** — Vercel → *Add New → Project* → this repo → Root Directory `server`
   → Framework *Other*. Environment variables:
   - `DATABASE_URL` — the PostgreSQL string
   - `SITEBUILDER_SECRET` — a long random string (required: there is no disk to keep one on)
   - `SITEBUILDER_OWNER_EMAIL` / `SITEBUILDER_OWNER_PASSWORD` — the owner account
     (not created without them)
   - `SITEBUILDER_CORS_ORIGIN` — the editor's address, e.g. `https://peddino-ai-elementor.vercel.app`
   - `GOOGLE_CLIENT_ID` if you use Google sign-in

   Deploy, then open `https://<api-project>.vercel.app/api/health` — it must say `{"ok":true}`
   — and `/api/templates` — it must list the templates.
4. **`client/vercel.json`** — replace both `YOUR-API-HOST` with the API project's
   host name (e.g. `peddino-ai-elementor-api.vercel.app`, no `https://`). Commit and push.
5. **Editor project** — Root Directory `client`, environment variable
   `VITE_API_URL=https://<api-project>.vercel.app` (and `VITE_GOOGLE_CLIENT_ID` if used).
   The build is automatically *lean* on Vercel: it leaves `public/original-templates`,
   `public/templates` and `public/gallery` out (~1.2 GB locally) and ships about 18 MB.
   The build refuses to run while `VITE_API_URL` is missing or `vercel.json` still has the placeholder.
6. Add the editor's address to the Google OAuth client's **Authorized JavaScript origins**.

Limits to know: Vercel functions accept request bodies up to 4.5 MB, so a saved site
larger than that cannot be uploaded; the rate limiter's counters live per function
instance, so it slows abuse rather than capping it exactly.

### Prove it before you go live

```bash
# 1. API on 8001 against the database you imported into
cd server && npm start

# 2. Every page of every template: files from PostgreSQL vs the original files on disk
cd client && node scripts/verify-template-parity.mjs        # 253 pages, ~15 min; ONLY=atlanta for one

# 3. The live topology in a browser: lean build, templates forwarded to the API
cd client
SITEBUILDER_LEAN_BUILD=1 VITE_API_URL=http://127.0.0.1:8001 npx vite build --outDir ../.tmp-dist
DIST=../.tmp-dist API=http://127.0.0.1:8001 node scripts/verify-live-topology.mjs
```

The first compares picture and file loading, page height and the first screen for
each page; the second walks gallery → preview → editor → *Download site* for a
spread of templates. `SITEBUILDER_TEMPLATE_PROXY=http://localhost:8001 npm run dev`
does the same forwarding in the dev server if you want to click through by hand.

