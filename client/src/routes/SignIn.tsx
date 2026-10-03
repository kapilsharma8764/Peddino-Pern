import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Layers3, Loader2, LockKeyhole, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { useAuthStore, type Account } from '@/store/authStore'
import { EditorScene } from '@/components/studio/Motion'
import { GoogleSignInButton } from './GoogleSignInButton'
import { MarketingFooter } from '@/marketing/MarketingPage'
import './SignIn.css'

export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const [mode, setMode] = useState<'in' | 'up' | 'forgot' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null)
  const redirectTimer = useRef<number | undefined>(undefined)
  const creating = mode === 'up'
  const recovering = mode === 'forgot' || mode === 'reset'
  function switchMode(next: typeof mode) { setMode(next); setError(''); setNotice(''); if (next === 'forgot' || next === 'reset') setPassword('') }
  async function recover(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (mode === 'forgot') {
        const result = await api.forgotPassword({ email })
        if (result.devCode) setCode(result.devCode)
        setNotice(result.devCode ? `${result.message} Code: ${result.devCode}` : result.message)
        setMode('reset')
      } else {
        const result = await api.resetPassword({ email, code, password })
        signIn(result.token, result.user)
        toast('Password changed — you are signed in')
        navigate('/dashboard')
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }
  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])

  function afterSignIn(token: string, user: Account, created = false) {
    signIn(token, user)
    const from = (location.state as { from?: string } | null)?.from
    const destination = from?.startsWith('/') && !from.startsWith('//') && !from.startsWith('/sign-in') ? from : '/'
    setSuccess({
      title: created ? 'Account created!' : 'Login successful!',
      message: created ? 'Your Peddino Site Builder workspace is ready.' : `Welcome back${user.name ? `, ${user.name}` : ''}.`,
    })
    redirectTimer.current = window.setTimeout(() => navigate(destination), 1500)
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = creating ? await api.register({ email, password, name }) : await api.login({ email, password })
      afterSignIn(result.token, result.user, creating)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Please try again.')
    } finally { setBusy(false) }
  }
  async function withGoogle(credential: string) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = await api.loginWithGoogle({ credential })
      afterSignIn(result.token, result.user)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in with Google. Please try again.')
    } finally { setBusy(false) }
  }
  return <div className="studio-auth h-full">
    <div className="auth-content">
    <div className="auth-grid">
      <section className="auth-story"><span className="studio-badge"><Sparkles size={13} /> YOUR OWN CREATIVE SPACE</span><h1>Big ideas.<br /><em>Beautiful beginnings.</em></h1><p>Your business deserves a website that feels like you.<br />Let’s make it happen.</p><EditorScene /><div className="auth-benefits"><span><Check size={14} /> Visual editing</span><span><Check size={14} /> Thoughtful templates</span><span><Check size={14} /> Room to grow</span></div></section>
      <section className="auth-panel"><Link to="/" className="auth-back"><ArrowLeft size={14} /> Back to the studio</Link><div className="auth-mark"><Layers3 size={25} /></div><span className="studio-eyebrow">{recovering ? 'LOCKED OUT? NO PROBLEM' : creating ? 'MAKE YOURSELF AT HOME' : 'YOUR NEXT CHAPTER AWAITS'}</span><h2>{recovering ? 'Reset your password.' : creating ? 'Create your account.' : 'Welcome back.'}</h2><p>{mode === 'forgot' ? 'Enter your account email and we will issue a six-digit reset code.' : mode === 'reset' ? 'Enter the code and choose a new password.' : creating ? 'A space for your ideas, websites and everything next.' : 'Your ideas are right where you left them.'}</p>
        {recovering ? <form onSubmit={recover} className="auth-form auth-recover">
          <div><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@yourbusiness.com" disabled={busy || mode === 'reset'} /></div>
          {mode === 'reset' && <><div><label htmlFor="reset-code">Reset code</label><input id="reset-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" placeholder="6-digit code" disabled={busy} /></div>
          <div><label htmlFor="new-password">New password</label><div className="password-field"><input id="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" disabled={busy} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div></>}
          {notice && <p role="status" className="auth-notice">{notice}</p>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button type="submit" disabled={busy} className="studio-button">{busy ? <Loader2 size={17} className="animate-spin" /> : null}{busy ? 'Just a moment…' : mode === 'forgot' ? 'Send reset code' : 'Save new password'}{!busy && <ArrowRight size={17} />}</button>
          <p className="auth-switch">{mode === 'reset' && <><button type="button" onClick={() => switchMode('forgot')}>Get a new code</button> · </>}<button type="button" onClick={() => switchMode('in')}>Back to sign in</button></p>
        </form> : <>
        <div className="auth-tabs" role="group" aria-label="Account access"><button type="button" className={!creating ? 'selected' : ''} onClick={() => switchMode('in')}>Sign in</button><button type="button" className={creating ? 'selected' : ''} onClick={() => switchMode('up')}>Create account</button></div>
        <form onSubmit={submit} className="auth-form">
          {creating && <div><label htmlFor="name">Your name</label><input id="name" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Alex Morgan" disabled={busy} /></div>}
          <div><label htmlFor="email">Email</label><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@yourbusiness.com" disabled={busy} /></div>
          <div><label htmlFor="password">Password</label><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} required minLength={creating ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={creating ? 'new-password' : 'current-password'} placeholder={creating ? 'Create a strong password' : 'Enter your password'} aria-describedby={creating ? 'password-hint' : undefined} disabled={busy} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{creating ? <small id="password-hint">At least 8 characters.</small> : <button type="button" className="auth-forgot" onClick={() => switchMode('forgot')}>Forgot password?</button>}</div>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button type="submit" disabled={busy} className="studio-button">{busy ? <Loader2 size={17} className="animate-spin" /> : null}{busy ? 'Just a moment…' : creating ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={17} />}</button>
        </form>
        <GoogleSignInButton onCredential={withGoogle} disabled={busy} />
        <p className="auth-switch">{creating ? 'Already have an account?' : 'New to Peddino Site Builder?'} <button type="button" onClick={() => switchMode(creating ? 'in' : 'up')}>{creating ? 'Sign in' : 'Create one'}</button></p>
        </>}
        <div className="auth-footnote"><LockKeyhole size={13} /> Your websites. Your workspace. Your next big thing.</div>
      </section>
    </div>
    </div>
    <div className="mk auth-footer"><MarketingFooter /></div>
    {success && <div className="auth-success-backdrop" role="presentation"><section className="auth-success-dialog" role="status" aria-live="assertive" aria-label={success.title}><span className="auth-success-icon"><CheckCircle2 size={31} /></span><span className="studio-eyebrow">YOU'RE ALL SET</span><h2>{success.title}</h2><p>{success.message}</p><span className="auth-success-loading"><i /><i /><i /> Opening your site…</span></section></div>}
  </div>
}
