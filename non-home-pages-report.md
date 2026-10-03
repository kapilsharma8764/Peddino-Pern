# Non-home page improvements

Project: `D:\david-task-main\5-09-2026\Peddino-Pern`

## Pages inspected and improved

The inspection covered the route definitions, application shell, shared navigation and footer, public page components, account screen, workspace routes, setup flows, editor entry, styles, test configuration, and API integration. Existing template/reference material and generated customer websites were preserved.

| Page | Route | Improvements |
| --- | --- | --- |
| Features | `/features` | Branded hero, builder illustration, capability cards, responsive layout and CTAs |
| How It Works | `/how-it-works` | Connected five-step overview, linked process cards, clearer spacing and CTA |
| Pricing | `/pricing` | Consistent plan cards, available/planned feature comparison, FAQ and CTA |
| About | `/about` | Mission section, existing product capability counts, story, values and CTA |
| Help | `/help` | Searchable FAQs, topic filters, clear-search recovery, support cards and CTA |
| Contact | `/contact` | Support categories, improved form hierarchy, existing validation and submission preserved |
| Privacy | `/privacy` | Readable document card, section dividers, improved line lengths and spacing |
| Terms | `/terms` | Same document presentation as Privacy; legal wording preserved |
| Login, signup and password recovery | `/sign-in` | Consistent account card, selected-mode styling, complete page scroll, shared footer and form first on mobile |
| Dashboard | `/dashboard` | Real site totals, improved site cards, clearer actions and useful empty state |
| Enquiries | `/leads` | Real enquiry totals, improved search/actions, responsive table and empty-search recovery |
| Choose a starting point | `/start` | Consistent choice cards, radii, purple controls and spacing |
| Business profile wizard | `/create` | Shared card/control styling and responsive spacing; existing steps retained |
| Template setup | `/start/template/:step` | Improved shared onboarding presentation for type and details screens |
| Custom-site setup | `/start/build/:step` | Same onboarding presentation for type, details, design and page selection |
| Guided builder | `/build` | Improved type/layout cards, headings, spacing and controls |
| Describe your business | `/describe` | Focused input card, clearer typography, examples and responsive actions |
| Import a website | `/upload` | Focused upload card, stronger drop zone, clearer file hierarchy and keyboard focus |
| Templates | `/templates` | Improved gallery heading and cards, consistent radius and actions; filters/previews preserved |
| Components | `/components` | Stronger heading, accessible search, responsive grid and clear-filter empty state |
| Settings | `/settings` | Shared heading, clearer settings navigation, form card and readable SEO preview |
| Editor | `/editor` | Scoped purple theme and original-template editor controls; editing canvas and functionality preserved |
| Missing page | `*` | Branded 404, correct Home link, Help and workspace recovery links |

Login and signup remain modes of the existing `/sign-in` page. No duplicate routes were created. The redirects `/new` → `/create` and `/layouts` → `/dashboard` were retained and checked. The dormant `BlankTemplates` component was inspected; it has no standalone route. Imported templates remain part of the existing gallery.

## Shared design and functionality

The new `interior-shell` class is applied only when the pathname is not `/`. All added shared CSS is scoped to that class. Existing Header and Footer components are reused. Public CTAs that require an account go through sign-in and retain their setup destination. Planned paid features remain clearly labelled; no prices or customer statistics were invented.

## Files modified or added

- `client/src/layout/AppLayout.tsx`
- `client/src/interior.css` (new)
- `client/src/components/WorkspaceMetrics.tsx` (new)
- `client/src/marketing/MarketingPage.tsx`
- `client/src/marketing/BuilderPreview.tsx` (new)
- `client/src/marketing/pages.tsx`
- `client/src/routes/Components.tsx`
- `client/src/routes/Dashboard.tsx`
- `client/src/routes/Describe.tsx`
- `client/src/routes/Leads.tsx`
- `client/src/routes/NotFound.tsx`
- `client/src/routes/Settings.tsx`
- `client/src/routes/SignIn.tsx`
- `client/src/routes/SignIn.css`
- `client/src/routes/Templates.tsx`
- `client/src/routes/UploadSite.tsx`
- `client/src/site-wizard/Wizard.tsx`
- `client/e2e/interior-pages.spec.ts` (new)
- `client/e2e/marketing-pages.spec.ts` (Home assertion updated to match the pre-existing Home heading)
- `client/e2e/upload.spec.ts` (edit assertion now commits the field with blur, matching the existing editor behavior)
- `server/src/template-verification.test.js` (fixture URL encoding fixed for a template filename containing a space)
- `non-home-pages-report.md` (new)

## Verification

- **Production build:** passed with `VITE_API_URL=http://127.0.0.1:8123`. Vite reports the existing large template/vendor chunk warning; there are no build errors.
- **Typecheck:** `npx tsc -b --pretty false` passed.
- **Lint:** `npm run lint` passed, including the final test changes.
- **Client unit tests:** all 779 tests passed across 53 files. The final run used the isolated test API so the publish integration test ran instead of skipping.
- **Server tests:** all 74 tests passed, including PostgreSQL authentication integration, using `node --import ./src/load-env.js --test src/**/*.test.js`.
- **Browser checks:** all 32 distinct selected checks passed across the full run and focused correction run. The full run passed 31 checks; one older upload test expected a draft edit before blur. After correcting that assertion, all four upload tests passed. There are no unresolved failures.
- **Responsive coverage:** route sweeps at 1440px, 820px and 390px, plus the existing tablet and Pixel mobile browser projects.
- **Functional coverage:** public navigation/footer links, Home navigation and idea interaction, account modes, sign-in return destination, Help search/filtering, plan presentation, real Contact submission, all workspace routes, both setup flows, guided builder, editor entry, file/folder imports and route redirects.
- **Whitespace check:** `git diff --check` passed.

The browser specs run against the built client and the isolated API on port 8123. The Home heading assertion and two old fixture expectations were corrected to match existing application behavior; no Home or editor functionality was changed to satisfy those tests.

## Home preservation

Home had pre-existing uncommitted changes when this task began. Those changes were preserved. SHA-256 checks matched the pre-task files for `Landing.tsx`, `studio.css`, `workspace.css`, `TopNav.tsx`, `landing-hero-video.css` and every file in `client/src/landing/`. A browser comparison at the same desktop viewport matched captured Home computed styles across all 994 elements. The shared Footer markup was not changed.

No commit or push was made.
