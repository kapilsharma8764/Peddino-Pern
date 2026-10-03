import rateLimit from 'express-rate-limit'

/**
 * Server-side AI. The Gemini key lives in the server's environment
 * (`GEMINI_API_KEY`), so a visitor never has to paste one into the browser.
 *
 * The browser still owns the prompts and checks every answer against the real
 * widget list; this route only carries the request to Gemini and back. That is
 * why it is signed-in only, rate limited per account, and size capped.
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const LIMITS = { system: 60_000, messages: 12, message: 6_000 }

/** Checks the body of `/api/ai/complete`. Returns the clean request, or `{ error }`. */
export function readAiRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Send a request body' }
  const { system, messages, temperature } = body
  if (typeof system !== 'string' || !system.trim()) return { error: 'The instructions are missing' }
  if (system.length > LIMITS.system) return { error: 'The instructions are too long' }
  if (!Array.isArray(messages) || messages.length === 0) return { error: 'Add at least one message' }
  if (messages.length > LIMITS.messages) return { error: 'Too many messages' }
  const clean = []
  for (const message of messages) {
    const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null
    if (!role || typeof message.text !== 'string' || !message.text.trim()) return { error: 'Each message needs a role and some text' }
    if (message.text.length > LIMITS.message) return { error: 'A message is too long' }
    clean.push({ role, text: message.text })
  }
  const temp = typeof temperature === 'number' ? Math.min(1, Math.max(0, temperature)) : 0.4
  return { system, messages: clean, temperature: temp }
}

/** Sends one request to Gemini and returns the JSON text it answered with. */
export async function askGemini({ system, messages, temperature }, { key, fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.text }] })),
      generationConfig: { responseMimeType: 'application/json', temperature },
    }),
  })
  if (!response.ok) {
    const error = new Error(`The AI service answered ${response.status}`)
    error.status = response.status
    throw error
  }
  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string' || !text) throw new Error('The AI service sent an empty answer')
  return text
}

/**
 * Adds `/api/ai/status` and `/api/ai/complete`.
 * `requireUser` and `asyncRoute` are the API's own helpers, passed in so this file stays easy to test.
 */
export function registerAiRoutes(app, { requireUser, asyncRoute, getKey = () => process.env.GEMINI_API_KEY, ask = askGemini }) {
  // Per account, not per address: the cost belongs to whoever is asking.
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: Number(process.env.RATE_LIMIT_AI) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip,
    validate: { keyGeneratorIpFallback: false },
    message: { error: 'You have used a lot of AI requests. Please wait a few minutes and try again.' },
  })

  app.get('/api/ai/status', (_req, res) => {
    res.json({ available: Boolean(getKey()) })
  })

  app.post(
    '/api/ai/complete',
    requireUser((req, res, next) => limiter(req, res, next)),
    requireUser(asyncRoute(async (req, res) => {
      const key = getKey()
      if (!key) return res.status(503).json({ error: 'AI is not switched on for this server yet' })
      const request = readAiRequest(req.body)
      if ('error' in request) return res.status(400).json({ error: request.error })
      try {
        const text = await ask(request, { key })
        res.json({ text })
      } catch (error) {
        const busy = error?.status === 429
        res.status(busy ? 429 : 502).json({ error: busy ? 'The AI service is busy. Please try again in a minute.' : 'The AI service could not answer. Please try again.' })
      }
    })),
  )
}
