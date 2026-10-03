import { useEffect, useRef, useState } from 'react'

/** Google's own four-colour "G" mark, drawn inline so it never depends on a network request. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  )
}

/**
 * "Sign in with Google", using Google's own Identity Services widget rather
 * than a button we drew ourselves. Google renders the button and handles the
 * popup; all this component does is load that script once, initialise it
 * with the site's client id, and hand the resulting credential upward — the
 * server is what actually verifies it.
 *
 * Without `VITE_GOOGLE_CLIENT_ID` set, the button still shows — clicking it
 * explains what is missing instead of the option simply not being there,
 * which is a much easier thing to notice and fix than a button that never
 * appeared in the first place.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const SCRIPT_ID = 'google-identity-services'
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (credential: string) => void
  disabled?: boolean
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const [unconfiguredNotice, setUnconfiguredNotice] = useState(false)
  const slot = useRef<HTMLDivElement>(null)
  // A stable reference so the effect below does not need `onCredential` in
  // its dependency array and re-run (and re-render Google's button) on
  // every keystroke elsewhere on the page.
  const handler = useRef(onCredential)
  useEffect(() => {
    handler.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId) return
    const id: string = clientId
    let cancelled = false

    function render() {
      if (cancelled || !slot.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: id,
        callback: (response) => handler.current(response.credential),
      })
      slot.current.replaceChildren()
      window.google.accounts.id.renderButton(slot.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
      })
    }

    if (window.google) {
      render()
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.append(script)
    }
    script.addEventListener('load', render)
    return () => {
      cancelled = true
      script.removeEventListener('load', render)
    }
  }, [clientId])

  if (!clientId) {
    return (
      <div className="auth-google">
        <div className="auth-divider"><span>or</span></div>
        <button
          type="button"
          className="auth-google-placeholder"
          onClick={() => setUnconfiguredNotice(true)}
        >
          <GoogleMark /> Continue with Google
        </button>
        {unconfiguredNotice && (
          <p role="status" className="auth-google-notice">
            Google sign-in is not set up on this install yet — the developer
            needs to add a Google client id (see README-RUN.md → "Sign in
            with Google").
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="auth-google">
      <div className="auth-divider"><span>or</span></div>
      <div ref={slot} className="auth-google-slot" aria-disabled={disabled} />
    </div>
  )
}
