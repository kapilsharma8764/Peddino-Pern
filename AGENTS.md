# Notes for AI coding agents

Peddino Site Builder (PERN version): a visual website builder. React client, Node/Express API, PostgreSQL.

## Layout

- `client/` React 19, Vite, TypeScript, Tailwind v4, zustand, react-router, dnd-kit. Tests: Vitest (unit), Playwright (`client/e2e`).
- `server/` Express 5 API (`server/src/index.js`) over PostgreSQL (`server/src/store.js`). Tests: `node --test`.
- `client/public/original-templates/` the ready-made templates (large; the server serves them from PostgreSQL in production).
- `Templates/`, `reference-projects/`, `unused/` and the `*.zip` files in the root are reference material. Do not edit or commit them.

## Rules

- **Do not push, and do not commit, unless the user asks.** Add only the files you changed; never `git add -A` (the tree holds large untracked folders).
- **Verify before saying it works.** Run the unit tests and the browser tests that touch what you changed.
- **Never break a working page.** Ask before adding a feature that was not requested.
- **No secrets in the repo.** `GEMINI_API_KEY` and other keys live in `server/.env` (git-ignored), never in client code.
- Keep comments short and in the style of the file you are editing. Write plain, everyday English in user-facing text.

## Commands

```bash
npm run dev                 # API on :8001 and the editor on :5173
npm --prefix client test    # unit tests
npm --prefix server test    # API tests (the integration test needs PostgreSQL)
npm run verify:quick        # lint, typecheck, unit tests
```

Browser tests run against a **built** client, and that build must point at the test API:

```bash
cd client
VITE_API_URL=http://127.0.0.1:8123 npm run build      # about 4 minutes; never run two builds at once
npx playwright test e2e/start-flow.spec.ts
```

Without that `VITE_API_URL` the page talks to the dev API (:8001) while the tests talk to :8123, and every signed-in test fails with "Please sign in".

## How the main parts work

- **A site** is a `SiteConfig` (`client/src/blocks/types.ts`): header and footer blocks, pages, theme. A page is a list of blocks. A site made from an original template keeps its HTML in one `html-embed` block per page.
- **Business details** from `/start` live in `useBusinessStore`. `onboarding/personalize-original.ts` writes them over a template (name, phone, email, address, social links).
- **AI** goes through `client/src/lib/ai-client.ts`: a personal Gemini key from Settings first, then the server's key via `/api/ai/complete`. Without either, callers fall back to built-in text. The server (`server/src/ai.js`) needs sign-in, limits each account, and never returns provider error details. Always check what the AI sends before using it (see `onboarding/write-with-ai.ts`, `editor/editor-assistant.ts`).
- **Colours** are CSS variables: `--color-*` (the editor) and `--brand-*` (sites). A custom site starts blank on the neutral theme.
- **Motion** on public pages: animate only `transform` and `opacity`, entrances once (`Reveal`), hover effects only under `(hover: hover)`, and honour `prefers-reduced-motion`.

- **Content comes from PostgreSQL.** Website types, starter designs, business presets, pricing, marketing copy and the layout templates are tables (`server/migrations/`), served by `server/src/routes/` and read in the client through `client/src/services/` and `store/catalogStore.ts`. The seed files in `client/src/data/seed/*.json` fill the database (`npm --prefix server run seed:content`) and are also the offline fallback; the layout templates in `client/src/templates/library/imported/*.ts` are only the source for `npm --prefix server run import:layout-templates` and for tests, and must not be imported by app code (use `templates/library/types` and `services/templateApi`).
- **A signed-in user's brief, setup progress and business answers** sync to `/api/me/*` (`client/src/lib/user-sync.ts`); localStorage is the guest copy and a cache. A personal Gemini key stays in the browser and is never sent to the API.
- **Rate limits** use the `rate_limits` table (`server/src/rate-limit-store.js`).

## Known gaps

- Address replacement fills about a third of the templates; the name cannot change where it is only inside a logo image.
- `server/src/template-verification.test.js` needs `parse5` (`cd server && npm install`).
