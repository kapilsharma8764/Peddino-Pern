import { app, ensureOwnerAccount } from '../src/index.js'

/**
 * Vercel entry point: the whole Express API runs as one serverless function
 * (see vercel.json, which sends every path here). Vercel calls the exported
 * function once per request; the owner account is made on the first one.
 */
let ready
export default async function handler(req, res) {
  ready ??= ensureOwnerAccount().catch((error) => {
    ready = undefined // try again on the next request
    console.error('[api] could not prepare the owner account', error.message)
  })
  await ready
  return app(req, res)
}
