export function resetEmailEnabled(env = process.env) {
  return Boolean(env.RESEND_API_KEY?.trim() && env.SITEBUILDER_MAIL_FROM?.trim())
}

/** Reset codes are sent by the server and never returned in production. */
export async function sendResetEmail(email, code, { env = process.env, fetchImpl = fetch } = {}) {
  if (!resetEmailEnabled(env)) throw new Error('Password reset email is not configured')
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from: env.SITEBUILDER_MAIL_FROM,
      to: [email],
      subject: 'Your Peddino password reset code',
      text: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, you can ignore this email.`,
    }),
  })
  if (!response.ok) throw new Error('Password reset email could not be sent')
}
