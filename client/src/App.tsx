import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './layout/ErrorBoundary'
import { AppLayout } from './layout/AppLayout'
import { Landing } from './routes/Landing'
import { SignIn } from './routes/SignIn'
import { useAuthStore } from './store/authStore'
import { NotFound } from './routes/NotFound'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { useUserSync } from './lib/user-sync'
import { loadCatalog } from './store/catalogStore'

// Each screen is its own chunk, so the first page (home or sign-in) does not pull in the editor,
// the 189 template files and the widget library just to show a button.
const CreateWebsite = lazy(() => import('./routes/CreateWebsite').then((m) => ({ default: m.CreateWebsite })))
const Start = lazy(() => import('./routes/Start').then((m) => ({ default: m.Start })))
const StartFlow = lazy(() => import('./start/StartFlow').then((m) => ({ default: m.StartFlow })))
const Wizard = lazy(() => import('./site-wizard/Wizard').then((m) => ({ default: m.Wizard })))
const Describe = lazy(() => import('./routes/Describe').then((m) => ({ default: m.Describe })))
const UploadSite = lazy(() => import('./routes/UploadSite').then((m) => ({ default: m.UploadSite })))
const Dashboard = lazy(() => import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })))
const Templates = lazy(() => import('./routes/Templates').then((m) => ({ default: m.Templates })))
const Leads = lazy(() => import('./routes/Leads').then((m) => ({ default: m.Leads })))
const Features = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Features })))
const HowItWorks = lazy(() => import('./marketing/pages').then((m) => ({ default: m.HowItWorks })))
const Pricing = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Pricing })))
const About = lazy(() => import('./marketing/pages').then((m) => ({ default: m.About })))
const Contact = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Contact })))
const Help = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Help })))
const Privacy = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import('./marketing/pages').then((m) => ({ default: m.Terms })))
const Editor = lazy(() => import('./routes/Editor').then((m) => ({ default: m.Editor })))
const Components = lazy(() => import('./routes/Components').then((m) => ({ default: m.Components })))
const Settings = lazy(() => import('./routes/Settings').then((m) => ({ default: m.Settings })))

/**
 * Keeps the app behind an account.
 *
 * Sites, enquiries and everything else belong to somebody, so there is nothing
 * useful to show before signing in. The sign-in screen itself sits outside.
 */
function RequireAccount({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  // A signed-out browser always returns to the public home page on reload.
  // This prevents a stale editor/dashboard URL from reopening after logout.
  if (!token) return <Navigate to="/" replace />
  return children
}

/**
 * The editor is entered from inside the app. A hard load or refresh of /editor (the first history
 * entry the page loaded on) goes to the SiteBuilder home instead of reopening it; saved
 * projects stay in storage and are opened again from the dashboard or the Editor link.
 */
// The history entry the page was loaded on. A browser keeps it across a refresh, and the router
// reads it back as that location's key, so any later in-app navigation has a different key.
const loadedOn = typeof window !== 'undefined' ? { path: window.location.pathname, key: (window.history.state as { key?: string } | null)?.key ?? 'default' } : null

function EditorEntry({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (loadedOn && loadedOn.path === '/editor' && location.key === loadedOn.key) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  useKeyboardShortcuts()
  // Website types, starter designs and business presets come from the API; the bundled copy shows until then.
  useEffect(() => { void loadCatalog() }, [])
  // A signed-in person's brief and setup progress follow their account across devices.
  useUserSync()

  return (
    <Suspense fallback={<div className="grid h-full min-h-[40vh] place-items-center text-sm text-slate-500" role="status">Loading…</div>}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="sign-in" element={<SignIn />} />
        <Route index element={<Landing />} />
        <Route path="features" element={<Features />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="help" element={<Help />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="start" element={<RequireAccount><Start /></RequireAccount>} />
        <Route path="build" element={<RequireAccount><Wizard /></RequireAccount>} />
        <Route path="start/:flow/:step" element={<RequireAccount><StartFlow /></RequireAccount>} />
        <Route path="create" element={<RequireAccount><CreateWebsite /></RequireAccount>} />
        <Route path="describe" element={<RequireAccount><Describe /></RequireAccount>} />
        <Route path="templates" element={<RequireAccount><Templates /></RequireAccount>} />
        <Route path="layouts" element={<Navigate to="/dashboard" replace />} />
        <Route path="upload" element={<RequireAccount><UploadSite /></RequireAccount>} />
        <Route path="dashboard" element={<RequireAccount><Dashboard /></RequireAccount>} />
        <Route path="leads" element={<RequireAccount><Leads /></RequireAccount>} />
        <Route path="new" element={<Navigate to="/create" replace />} />
        <Route path="editor" element={<RequireAccount><EditorEntry><Editor /></EditorEntry></RequireAccount>} />
        <Route path="components" element={<Components />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
