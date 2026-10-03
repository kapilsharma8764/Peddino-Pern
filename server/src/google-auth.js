import { OAuth2Client } from 'google-auth-library'

/**
 * Verifying "Sign in with Google".
 *
 * The browser gets an ID token straight from Google and sends it here as
 * `credential`. This is the only step that matters for security: the token
 * is a JWT signed by Google, and `verifyIdToken` checks that signature
 * against Google's own public keys and confirms it was issued for *this*
 * app's client id — so a token minted for some other site cannot be replayed
 * here, and nothing about the login is taken on the browser's word alone.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID

let client = null
function oauthClient() {
  if (!client) client = new OAuth2Client(CLIENT_ID)
  return client
}

/** Whether the server has a client id configured, so the route can be skipped otherwise. */
export function googleSignInEnabled() {
  return Boolean(CLIENT_ID)
}

/**
 * The verified email and name from a Google ID token, or null if the token
 * is missing, expired, forged, or was issued for a different app.
 */
export async function verifyGoogleCredential(credential) {
  if (!CLIENT_ID || !credential) return null
  try {
    const ticket = await oauthClient().verifyIdToken({ idToken: credential, audience: CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email) return null
    // Google only sets this false for an address it could not confirm belongs
    // to the person signing in — treated the same as no email at all.
    if (payload.email_verified === false) return null
    return { email: payload.email, name: payload.name ?? '' }
  } catch {
    return null
  }
}
