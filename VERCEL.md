# Deploy Peddino-Pern

Import `kapilsharma8764/Peddino-Pern` into Vercel with the repository root as the root directory. The root `vercel.json` builds the client and server as services on one domain. API requests, template assets and published sites go to the server; other requests go to the client.

Set these environment variables in Vercel before using the app:

- `DATABASE_URL`: a hosted PostgreSQL connection string with SSL. A localhost database cannot be reached from Vercel.
- `SITEBUILDER_SECRET`: a fixed, randomly generated session secret.
- `NODE_ENV`: `production`.
- `GEMINI_API_KEY`: optional, for server AI features.
- `RESEND_API_KEY` and `SITEBUILDER_MAIL_FROM`: password reset email. The sender must use a domain verified in Resend.
- `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`: optional Google sign-in; use the same OAuth client ID and authorize the live site origin in Google Cloud.

The client service builds with an empty `VITE_API_URL`, so it calls the API on its own domain. Do not put database credentials or API keys in `VITE_*` variables.

Fill the hosted database using `seed:content` and `import:layout-templates`, with `DATABASE_URL` pointing at that database. Template files stay outside Git and Vercel uploads; the API serves them from PostgreSQL.

After the first deployment, set `SITEBUILDER_CORS_ORIGIN` to its HTTPS domain. Pushes to the connected GitHub branch trigger future deployments.

`/api/health` returns 200 only when PostgreSQL is reachable, and 503 when it is unavailable. Password reset returns an availability error when email is not configured, rather than claiming that a code was sent.

For a 1 GB database, run `npm --prefix server run export:compact-templates` with the local source database configured. It creates a git-ignored export under `server/data/compact-templates`, converts still JPEG/PNG images to WebP when smaller, and stores repeated files once. Original URLs, HTML, CSS, fonts and videos remain available. Source files and source database rows are preserved. Unreadable source images are retained and listed in the manifest for review.

Then set `DATABASE_URL` to the hosted target and run `npm --prefix server run import:compact-templates`. It checks asset hashes and enforces a 750 MB binary-data budget, leaving room for metadata and users. Re-running the import is safe. Avoid the original `import:templates` command on a 1 GB target: its per-path storage uses about 3.5 GB.
