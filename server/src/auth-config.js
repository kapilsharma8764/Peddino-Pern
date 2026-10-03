/** Resolve configuration without logging or silently changing a configured key. */
export function resolveSigningSecret(env, developmentFallback) {
  const configured = env.SITEBUILDER_SECRET
  if (env.NODE_ENV === 'production') {
    // Minimum configuration hygiene, not a claim that length proves entropy.
    // Never trim the returned key: that would invalidate existing signatures.
    if (typeof configured !== 'string' || configured.trim().length < 32) {
      throw new Error('SITEBUILDER_SECRET must contain at least 32 non-padding characters in production')
    }
    return configured
  }
  return configured ?? developmentFallback()
}
