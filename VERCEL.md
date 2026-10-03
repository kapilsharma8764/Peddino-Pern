# Deploy Peddino-Pern

Import `kapilsharma8764/Peddino-Pern` into Vercel with the repository root as the root directory. The root `vercel.json` builds the client and server as services on one domain. API requests, template assets and published sites go to the server; other requests go to the client.

Set these environment variables in Vercel before using the app:

- `DATABASE_URL`: a hosted PostgreSQL connection string with SSL. A localhost database cannot be reached from Vercel.
- `SITEBUILDER_SECRET`: a fixed, randomly generated session secret.
- `NODE_ENV`: `production`.
- `GEMINI_API_KEY`: optional, for server AI features.

The client service builds with an empty `VITE_API_URL`, so it calls the API on its own domain. Do not put database credentials or API keys in `VITE_*` variables.

Fill the hosted database using the existing server commands: `seed:content`, `import:layout-templates` and `import:templates`. Run them with `DATABASE_URL` pointing at that database. Template files stay outside Git and Vercel uploads; the API serves them from PostgreSQL.

After the first deployment, set `SITEBUILDER_CORS_ORIGIN` to its HTTPS domain. Pushes to the connected GitHub branch trigger future deployments.
