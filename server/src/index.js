import './load-env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { DuplicateError, closeStore, find, get, getTemplateAsset, getTemplateCatalog, increment, insert, list, remove, update } from './store.js'
import { templateAssetHandler } from './template-assets.js'
import { uniqueSlug } from './slug.js'
import { publishedPageLinks } from './published-links.js'
import {
  checkCredentials,
  createResetCode,
  createToken,
  hashPassword,
  normaliseEmail,
  readToken,
  verifyPassword,
} from './auth.js'
import { registerAiRoutes } from './ai.js'
import { PgRateLimitStore } from './rate-limit-store.js'
import { registerCatalogRoutes } from './routes/catalog.js'
import { registerLayoutTemplateRoutes } from './routes/layout-templates.js'
import { registerMeRoutes } from './routes/me.js'
import { cachedFor } from './ttl-cache.js'
import { createViewCounter } from './views.js'
import { googleSignInEnabled, verifyGoogleCredential } from './google-auth.js'

/**
 * The API behind the builder: saving a site, publishing it to a public
 * address, and collecting the enquiries that come back from it.
 */

const PORT = Number(process.env.PORT ?? 8001)
const app = express()

// Deployed behind a reverse proxy (Render, Railway, nginx, a CDN) the real
// client address and protocol arrive as `X-Forwarded-*` headers, not on the
// socket. Trusting the first hop is what makes rate limiting key off the
// visitor's own IP instead of the proxy's, and what makes a published site's
// URL read `https://` instead of `http://`. Set `TRUST_PROXY=0` to turn this
// off on a host with no proxy in front.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))

// Standard hardening headers (X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security once behind HTTPS, and it turns off the
// `X-Powered-By: Express` header that would otherwise name the framework to
// anyone probing the site). Content-Security-Policy is left off: this API
// also serves published sites' own HTML verbatim at `/site/*`, and those
// pages embed whatever fonts, images and video players their owner chose —
// a generic CSP here would break them, not protect them.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }))

// Allowed origins are explicit in production; unset, the API reflects
// whichever origin asked, which is what local development needs since the
// client's port can change. Set `SITEBUILDER_CORS_ORIGIN` (comma-separated)
// before deploying so only the real client origin can call this API.
const allowedOrigins = process.env.SITEBUILDER_CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean)
app.use(cors({ origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true, credentials: true }))

// Template files (pages, CSS, fonts, pictures) are stored in PostgreSQL and served
// at the URLs they always had. Registered before the rate limiter below: one
// template page pulls in dozens of files, and the visitor's own limit on API
// calls is not meant to count them.
const serveTemplateAsset = templateAssetHandler(getTemplateAsset)
app.get('/original-templates/*path', serveTemplateAsset)
app.get('/templates/*path', serveTemplateAsset)

// The gallery's list of templates, as JSON. Public (the gallery is the first
// thing a new visitor sees) and cacheable: it only changes when someone re-runs
// the importer.
// Remembered for five minutes so the gallery does not read the database on every visit.
const templateCatalog = cachedFor(5 * 60 * 1000, getTemplateCatalog)
app.get('/api/templates', async (_req, res, next) => {
  try {
    const templates = await templateCatalog()
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    res.json(templates)
  } catch (error) {
    next(error)
  }
})

// Sites carry their whole block tree, which is comfortably larger than the
// default limit once a template with photographs is in it.
app.use(express.json({ limit: '8mb' }))

/**
 * Refuses any request body carrying a database operator key (`$gt`, `$ne`, a
 * dotted path…) where a plain value was expected — the standard shape of a
 * NoSQL-injection attempt. Nothing in this API currently forwards request
 * bodies straight into a database filter, so this is a second line of
 * defence rather than a fix for a known hole, kept cheap on purpose.
 */
function rejectsOperatorKeys(value) {
  if (Array.isArray(value)) return value.some(rejectsOperatorKeys)
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, nested]) => key.startsWith('$') || key.includes('.') || rejectsOperatorKeys(nested),
    )
  }
  return false
}
app.use((req, res, next) => {
  if (rejectsOperatorKeys(req.body)) {
    return res.status(400).json({ error: 'That request could not be processed' })
  }
  next()
})

// A generous ceiling on the whole API, then two tighter ones on the routes
// that matter most: guessing a password, and flooding a stranger's contact
// form. Keyed by IP (via `trust proxy` above), not by account, since the
// point is to slow down a request before anyone has signed in.
//
// The counters live in PostgreSQL (`rate_limits`), so a restart does not give
// everyone a fresh allowance. If the database is unreachable the limiters let
// requests through (`passOnStoreError`) instead of locking everyone out.
const limiterStore = (name) => ({ store: new PgRateLimitStore(name), passOnStoreError: true })
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_GENERAL) || 600,
    standardHeaders: true,
    legacyHeaders: false,
    ...limiterStore('general'),
  }),
)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Overridable so an automated test run, which creates dozens of accounts from
  // one address, is not locked out. Production leaves it unset.
  limit: Number(process.env.RATE_LIMIT_AUTH) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  ...limiterStore('auth'),
})
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent from this address. Please try again later.' },
  ...limiterStore('leads'),
})

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})


// ── Accounts ───────────────────────────────────────────────────────────────

/** The signed-in user, or null. Read from the Authorization header. */
async function currentUser(req) {
  const header = req.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const userId = readToken(token)
  return userId ? get('users', userId) : null
}

/**
 * Wraps a route so it only runs for a signed-in user.
 *
 * Everything about a site belongs to whoever made it, so the check lives here
 * rather than being remembered separately in each handler.
 */
function requireUser(handler) {
  return asyncRoute(async (req, res, next) => {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in' })
    req.user = user
    return handler(req, res, next)
  })
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name ?? '' }
}

app.post(
  '/api/auth/register',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, password, name } = req.body ?? {}

    const problem = checkCredentials(email, password)
    if (problem) return res.status(400).json({ error: problem })

    const address = normaliseEmail(email)
    const existing = await find('users', (row) => row.email === address)
    if (existing) return res.status(409).json({ error: 'That email is already registered' })

    let user
    try {
      user = await insert('users', {
        email: address,
        name: String(name ?? '').trim(),
        password: hashPassword(password),
      })
    } catch (error) {
      // The check above still closes the door in the overwhelmingly common
      // case; this only fires when two requests for the same address landed
      // at the same moment and both passed it — the database's own unique
      // index is what actually decides which one wins.
      if (error instanceof DuplicateError) {
        return res.status(409).json({ error: 'That email is already registered' })
      }
      throw error
    }

    res.status(201).json({ token: createToken(user.id), user: publicUser(user) })
  }),
)

app.post(
  '/api/auth/login',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, password } = req.body ?? {}
    const user = await find('users', (row) => row.email === normaliseEmail(email))

    // The same message either way, so this cannot be used to find out which
    // addresses have accounts.
    if (!user || !verifyPassword(String(password ?? ''), user.password)) {
      if (user && !user.password) {
        return res.status(401).json({ error: 'This account signs in with Google. Use the Google button below.' })
      }
      return res.status(401).json({ error: 'Wrong email or password' })
    }

    res.json({ token: createToken(user.id), user: publicUser(user) })
  }),
)

/**
 * "Sign in with Google". The browser hands over the ID token Google's own
 * button produced; `verifyGoogleCredential` is what actually establishes who
 * this is — an existing account with that email signs straight in (however
 * it was first created, since a verified Google email is a stronger proof of
 * ownership than nothing at all), and a new email creates one.
 */
app.post(
  '/api/auth/google',
  authLimiter,
  asyncRoute(async (req, res) => {
    if (!googleSignInEnabled()) {
      return res.status(503).json({ error: 'Sign in with Google is not configured on this server' })
    }

    const verified = await verifyGoogleCredential(req.body?.credential)
    if (!verified) return res.status(401).json({ error: 'Could not verify that Google account' })

    const address = normaliseEmail(verified.email)
    let user = await find('users', (row) => row.email === address)
    if (!user) {
      try {
        user = await insert('users', { email: address, name: verified.name, password: null, provider: 'google' })
      } catch (error) {
        if (!(error instanceof DuplicateError)) throw error
        user = await find('users', (row) => row.email === address)
      }
    }

    res.json({ token: createToken(user.id), user: publicUser(user) })
  }),
)

// ── Forgotten passwords ─────────────────────────────────────────────────────
//
// Step one issues a six-digit code valid for 15 minutes; step two trades that
// code for a new password. Only a hash of the code is stored. There is no mail
// service wired up, so outside production the code is returned to the page and
// printed in the server console; in production neither happens and the
// response never reveals whether the address has an account.

const RESET_MINUTES = 15
const RESET_ATTEMPTS = 5
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

app.post(
  '/api/auth/forgot',
  authLimiter,
  asyncRoute(async (req, res) => {
    const address = normaliseEmail(req.body?.email)
    if (!address.includes('@')) return res.status(400).json({ error: 'Please enter your email address' })

    const reply = { ok: true, message: 'If that email has an account, a reset code has been issued.' }
    const user = await find('users', (row) => row.email === address)
    if (!user) {
      if (IS_PRODUCTION) return res.json(reply)
      return res.status(404).json({ error: 'No account uses that email address' })
    }

    const code = createResetCode()
    await update('users', user.id, {
      reset: {
        hash: hashPassword(code),
        expires: Date.now() + RESET_MINUTES * 60 * 1000,
        attempts: 0,
      },
    })

    if (IS_PRODUCTION) return res.json(reply)
    console.log(`[auth] password reset code for ${address}: ${code}`)
    res.json({ ...reply, message: `Your reset code is ready. It expires in ${RESET_MINUTES} minutes.`, devCode: code })
  }),
)

app.post(
  '/api/auth/reset',
  authLimiter,
  asyncRoute(async (req, res) => {
    const { email, code, password } = req.body ?? {}
    const address = normaliseEmail(email)
    const user = await find('users', (row) => row.email === address)
    const reset = user?.reset

    if (!reset || reset.expires < Date.now() || reset.attempts >= RESET_ATTEMPTS) {
      return res.status(400).json({ error: 'That code has expired. Please request a new one.' })
    }
    if (!verifyPassword(String(code ?? '').trim(), reset.hash)) {
      await update('users', user.id, { reset: { ...reset, attempts: reset.attempts + 1 } })
      return res.status(400).json({ error: 'That code is not right' })
    }

    const problem = checkCredentials(address, password)
    if (problem) return res.status(400).json({ error: problem })

    const saved = await update('users', user.id, { password: hashPassword(password), reset: null })
    res.json({ token: createToken(saved.id), user: publicUser(saved) })
  }),
)

app.get(
  '/api/auth/me',
  asyncRoute(async (req, res) => {
    const user = await currentUser(req)
    if (!user) return res.status(401).json({ error: 'Not signed in' })
    res.json({ user: publicUser(user) })
  }),
)

/** Whether anyone has signed up yet, so the client can offer the right screen. */
app.get(
  '/api/auth/status',
  asyncRoute(async (_req, res) => {
    const users = await list('users')
    res.json({ hasAccounts: users.length > 0 })
  }),
)

// ── Sites ──────────────────────────────────────────────────────────────────

/**
 * Sites saved before accounts existed.
 *
 * Accounts arrived after the builder did, so an install can hold sites with
 * nobody attached. They are offered rather than handed over automatically:
 * claiming somebody's work on their behalf, on the strength of being the first
 * to sign up, is the kind of guess that is wrong exactly when it matters.
 */
app.get(
  '/api/sites/unowned',
  requireUser(async (_req, res) => {
    const unowned = (await list('sites')).filter((site) => !site.userId)
    res.json({ count: unowned.length, names: unowned.map((site) => site.name) })
  }),
)

app.post(
  '/api/sites/claim',
  requireUser(async (req, res) => {
    const unowned = (await list('sites')).filter((site) => !site.userId)
    for (const site of unowned) {
      await update('sites', site.id, { userId: req.user.id })
    }
    res.json({ claimed: unowned.length })
  }),
)

app.get(
  '/api/sites',
  requireUser(async (req, res) => {
    const sites = await list('sites', { userId: req.user.id })

    // The whole block tree is far too much for a list of cards, but a card
    // with no picture of the site is not much of a card. The first few
    // sections and the theme are enough to draw a recognisable thumbnail.
    res.json(
      sites.map(({ config, pages: publishedPages, html, ...rest }) => ({
        pageCount: Array.isArray(publishedPages) ? publishedPages.length : html ? 1 : 0,
        ...rest,
        sectionCount: Array.isArray(config?.blocks) ? config.blocks.length : 0,
        preview: {
          theme: config?.theme ?? null,
          header: Array.isArray(config?.header) ? config.header : [],
          blocks: Array.isArray(config?.blocks) ? config.blocks.slice(0, 3) : [],
        },
      })),
    )
  }),
)

app.get(
  '/api/sites/:id',
  requireUser(async (req, res) => {
    const site = await get('sites', req.params.id)
    // A site belonging to someone else is reported as missing rather than as
    // forbidden, which would confirm it exists.
    if (!site || site.userId !== req.user.id) return res.status(404).json({ error: 'No such site' })
    res.json(site)
  }),
)

app.post(
  '/api/sites',
  requireUser(async (req, res) => {
    const { name, config, profile } = req.body ?? {}
    if (!config) return res.status(400).json({ error: 'A site needs a config' })
    const site = await insert('sites', {
      userId: req.user.id,
      name: name || config.name || 'My Website',
      config,
      profile: profile ?? null,
      published: false,
      slug: null,
    })
    res.status(201).json(site)
  }),
)

app.put(
  '/api/sites/:id',
  requireUser(async (req, res) => {
    const { name, config, profile } = req.body ?? {}
    const owned = await get('sites', req.params.id)
    if (!owned || owned.userId !== req.user.id) {
      return res.status(404).json({ error: 'No such site' })
    }
    const site = await update('sites', req.params.id, {
      ...(name === undefined ? {} : { name }),
      ...(config === undefined ? {} : { config }),
      ...(profile === undefined ? {} : { profile }),
    })
    if (!site) return res.status(404).json({ error: 'No such site' })
    res.json(site)
  }),
)

app.delete(
  '/api/sites/:id',
  requireUser(async (req, res) => {
    const owned = await get('sites', req.params.id)
    if (!owned || owned.userId !== req.user.id) {
      return res.status(404).json({ error: 'No such site' })
    }
    const removed = await remove('sites', req.params.id)
    if (!removed) return res.status(404).json({ error: 'No such site' })
    res.status(204).end()
  }),
)

// ── Publishing ─────────────────────────────────────────────────────────────

/**
 * The client renders the HTML — it owns the one renderer that also draws the
 * canvas — and posts the finished file here. That is what keeps a published
 * page identical to what the user was looking at.
 */
app.post(
  '/api/sites/:id/publish',
  requireUser(async (req, res) => {
    const { pages, html } = req.body ?? {}

    // A site is a list of pages. A lone `html` is still accepted so anything
    // published before multi-page support keeps working.
    const pageList = Array.isArray(pages) && pages.length > 0
      ? pages
      : typeof html === 'string' && html.trim()
        ? [{ slug: '', name: 'Home', html }]
        : null

    if (!pageList) return res.status(400).json({ error: 'Nothing to publish' })
    if (pageList.some((page) => !page || typeof page.html !== 'string' || typeof page.slug !== 'string')) {
      return res.status(400).json({ error: 'Each page needs HTML and a page address' })
    }

    const site = await get('sites', req.params.id)
    if (!site || site.userId !== req.user.id) {
      return res.status(404).json({ error: 'No such site' })
    }

    // Slugs are unique across the whole server, not per user, because they are
    // public addresses. Only sites that already have one can collide, so this
    // only has to look at those — not every saved-but-unpublished draft too.
    const publishedSites = await list('sites', { slug: { $type: 'string' } })
    const slug = site.slug ?? uniqueSlug(site.name, publishedSites, site.id)
    const resolvedPages = publishedPageLinks(pageList, slug)

    let published
    try {
      published = await update('sites', site.id, {
        slug,
        pages: resolvedPages,
        // The home page is kept here as well, so anything still reading
        // `html` — an older client, a bookmark of the API — sees the front
        // page.
        html: (resolvedPages.find((page) => !page.slug) ?? resolvedPages[0]).html,
        published: true,
        publishedAt: new Date().toISOString(),
      })
    } catch (error) {
      // Two publishes computing the same fresh slug at the same instant is
      // rare, not impossible — asking for a retry is honest where silently
      // overwriting somebody else's address would not be.
      if (error instanceof DuplicateError) {
        return res.status(409).json({ error: 'That address was just taken — please publish again.' })
      }
      throw error
    }

    res.json({
      slug,
      url: `${req.protocol}://${req.get('host')}/site/${slug}`,
      publishedAt: published.publishedAt,
      pages: pageList.length,
    })
  }),
)

app.post(
  '/api/sites/:id/unpublish',
  requireUser(async (req, res) => {
    const owned = await get('sites', req.params.id)
    if (!owned || owned.userId !== req.user.id) {
      return res.status(404).json({ error: 'No such site' })
    }
    const site = await update('sites', req.params.id, { published: false })
    res.json({ published: false })
  }),
)

function notFound(res, message) {
  return res
    .status(404)
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Not found</title>` +
        `<body style="font-family:system-ui;padding:48px;text-align:center;color:#444">` +
        `<p>${message}</p></body>`,
    )
}

/**
 * A published site by its address. This runs on every visit to every
 * published page — the busiest, only-unauthenticated route the server has —
 * so it asks the database for the one matching document directly instead of
 * loading every site on the server to search through in memory, which would
 * get slower with every site anyone ever published, not just this one.
 */
// Visits to a published site's home page, added up in memory and saved every half minute.
const viewCounter = createViewCounter((id, count) => increment('sites', id, 'views', count))

async function findPublished(slug) {
  const [site] = await list('sites', { slug, published: true })
  return site
}

/** A page of a published site: its home page. */
app.get(
  '/site/:slug',
  asyncRoute(async (req, res) => {
    const site = await findPublished(req.params.slug)
    if (!site) return notFound(res, 'No site here yet.')

    const home = Array.isArray(site.pages)
      ? site.pages.find((page) => !page.slug) ?? site.pages[0]
      : null

    const html = home?.html ?? site.html
    if (!html) return notFound(res, 'No site here yet.')

    viewCounter.hit(site.id)
    res.type('html').send(html)
  }),
)

/**
 * Any other page of the site — /site/sharma-coaching/about.
 *
 * Before this the pages existed only inside the editor: publishing sent one
 * page and every menu link led nowhere.
 */
app.get(
  '/site/:slug/:page',
  asyncRoute(async (req, res) => {
    const site = await findPublished(req.params.slug)
    if (!site) return notFound(res, 'No site here yet.')

    const wanted = req.params.page.replace(/\.html$/, '')
    const page = Array.isArray(site.pages)
      ? site.pages.find((row) => row.slug === wanted)
      : null

    if (!page) return notFound(res, 'That page is not part of this site.')
    res.type('html').send(page.html)
  }),
)

// ── Enquiries ──────────────────────────────────────────────────────────────

/**
 * Where a published site's contact form posts.
 *
 * Kept deliberately forgiving about which fields arrive: a form the owner
 * edited should still deliver the enquiry rather than reject it.
 */
app.post(
  '/api/leads',
  leadsLimiter,
  asyncRoute(async (req, res) => {
    const { siteId, slug, name, email, phone, message, ...rest } = req.body ?? {}

    if (!name && !email && !phone && !message) {
      return res.status(400).json({ error: 'The enquiry was empty' })
    }

    const lead = await insert('leads', {
      siteId: siteId ?? null,
      slug: slug ?? null,
      name: name ?? '',
      email: email ?? '',
      phone: phone ?? '',
      message: message ?? '',
      extra: rest,
      status: 'new',
    })

    res.status(201).json({ id: lead.id, received: true })
  }),
)

app.get(
  '/api/leads',
  requireUser(async (req, res) => {
    // Only enquiries for this user's own sites. A visitor can send one without
    // an account; reading them is another matter.
    const own = new Set((await list('sites', { userId: req.user.id })).map((site) => site.id))
    const requested = req.query.siteId ? String(req.query.siteId) : null
    if (requested && !own.has(requested)) return res.json([])

    const all = await list('leads')
    const leads = all.filter((lead) =>
      requested ? lead.siteId === requested : lead.siteId && own.has(lead.siteId),
    )
    // Newest first — an enquiry inbox is read from the top.
    leads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    res.json(leads)
  }),
)

/**
 * The enquiry, if it was sent to one of this user's own sites — otherwise null.
 *
 * Anyone may *send* an enquiry, but only the owner of the site it was sent to
 * may change or delete it. One with no site attached belongs to nobody, so no
 * account may touch it; an unknown id and someone else's id look the same, so
 * a stranger cannot tell which enquiries exist.
 */
async function ownedLead(req) {
  const lead = await get('leads', req.params.id)
  if (!lead?.siteId) return null
  const site = await get('sites', lead.siteId)
  return site && site.userId === req.user.id ? lead : null
}

app.patch(
  '/api/leads/:id',
  requireUser(async (req, res) => {
    const { status, note } = req.body ?? {}
    const allowed = ['new', 'contacted', 'won', 'lost']
    if (status !== undefined && !allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of ${allowed.join(', ')}` })
    }
    if (!(await ownedLead(req))) return res.status(404).json({ error: 'No such enquiry' })
    const lead = await update('leads', req.params.id, {
      ...(status === undefined ? {} : { status }),
      ...(note === undefined ? {} : { note }),
    })
    if (!lead) return res.status(404).json({ error: 'No such enquiry' })
    res.json(lead)
  }),
)

app.delete(
  '/api/leads/:id',
  requireUser(async (req, res) => {
    if (!(await ownedLead(req))) return res.status(404).json({ error: 'No such enquiry' })
    const removed = await remove('leads', req.params.id)
    if (!removed) return res.status(404).json({ error: 'No such enquiry' })
    res.status(204).end()
  }),
)

// ── AI ─────────────────────────────────────────────────────────────────────

registerAiRoutes(app, { requireUser, asyncRoute, limiterStore: limiterStore('ai') })

// ── Content, templates and per-user data ───────────────────────────────────

registerCatalogRoutes(app, { asyncRoute })
registerLayoutTemplateRoutes(app, { asyncRoute })
registerMeRoutes(app, { requireUser })

// ── Errors ─────────────────────────────────────────────────────────────────

app.use((error, _req, res, _next) => {
  // A body that isn't valid JSON surfaces here as a SyntaxError from the
  // parser above; that is the visitor's mistake, not the server's, so it is
  // reported as one rather than folded into the generic 500 below.
  if (error?.type === 'entity.parse.failed' || error instanceof SyntaxError) {
    return res.status(400).json({ error: 'That request was not valid.' })
  }
  console.error('[api]', error)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

/**
 * The owner's account on a local install. Created only when missing, so a
 * password changed through "Forgot password" is never overwritten. Skipped for
 * test and CI databases (the ones `SITEBUILDER_DATA` selects).
 *
 * The fallback password below is a convenience for running this on a
 * developer's own machine, where anyone who could read it from the source
 * already has the machine. It must never be the password an account gets on
 * a real, internet-facing deployment — a hardcoded password in public source
 * is not a secret — so production only ever uses one actually set through
 * `SITEBUILDER_OWNER_PASSWORD`, and skips creating the account rather than
 * falling back to a guessable one.
 */
const OWNER_EMAIL = process.env.SITEBUILDER_OWNER_EMAIL ?? (IS_PRODUCTION ? undefined : 'sharma955kapil@gmail.com')
const OWNER_PASSWORD = process.env.SITEBUILDER_OWNER_PASSWORD ?? (IS_PRODUCTION ? undefined : 'sitebuilder-dev')

export async function ensureOwnerAccount() {
  if (process.env.SITEBUILDER_DATA || !OWNER_EMAIL || !OWNER_PASSWORD) return
  const address = normaliseEmail(OWNER_EMAIL)
  if (await find('users', (row) => row.email === address)) return
  try {
    await insert('users', { email: address, name: 'Kapil Sharma', password: hashPassword(OWNER_PASSWORD) })
    console.log(`[auth] created owner account ${address}`)
  } catch (error) {
    if (!(error instanceof DuplicateError)) throw error
  }
}

// On Vercel the app runs as a serverless function (server/api/index.js), which
// receives requests directly — it must not open a port of its own.
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`SiteBuilder API on http://localhost:${PORT}`)
    if (IS_PRODUCTION && (!allowedOrigins || allowedOrigins.length === 0)) {
      console.warn('[api] SITEBUILDER_CORS_ORIGIN is not set — this production server accepts requests from any origin. Set it to your site\'s real domain.')
    }
    if (IS_PRODUCTION && !process.env.SITEBUILDER_SECRET) {
      console.warn('[api] SITEBUILDER_SECRET is not set — sessions will not survive a restart. Set it to a fixed random value.')
    }
    ensureOwnerAccount().catch((error) => {
      console.error('[api] could not reach PostgreSQL — is the PostgreSQL service running, and is DATABASE_URL right?', error.message)
    })
  })

  // A dead-but-not-closed socket (a phone that lost signal mid-request, a
  // proxy that never sent a close) would otherwise hold a connection open
  // indefinitely; these bound how long the server waits before giving up on
  // one, which is what keeps a slow client from slowly starving every other
  // visitor of a free connection.
  server.requestTimeout = 30_000
  server.headersTimeout = 35_000
  server.keepAliveTimeout = 65_000

  // A platform that redeploys this process (a new release, a scale-down)
  // sends SIGTERM and expects an exit soon after — not an instant kill that
  // cuts off whoever's request was mid-flight. This stops taking new
  // connections, lets in-flight ones finish, then closes the database
  // connection cleanly.
  let shuttingDown = false
  function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[api] ${signal} received, shutting down`)
    server.close(async () => {
      await viewCounter.flush().catch(() => {})
      await closeStore().catch(() => {})
      process.exit(0)
    })
    // A shutdown that hangs — a connection that never drains — should not
    // hang the deploy forever either.
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // An error that reached neither a route's own try/catch nor the error
  // middleware above must not take the whole process down silently — logged
  // here so it's visible, rather than the server simply vanishing.
  process.on('unhandledRejection', (reason) => {
    console.error('[api] unhandled rejection', reason)
  })
}

export { app };
