import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TopNav } from './TopNav'
import { Toaster } from 'sonner'
import { ShortcutsModal } from '@/editor/ShortcutsModal'
import { AmbientBackground } from '@/components/studio/Motion'
import { MotionContext } from '@/components/studio/motion-context'
import { marketingPaths } from '@/brand'
import '@/interior.css'

export function AppLayout() {
  const location = useLocation()
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const editor = location.pathname === '/editor'
  const marketing = marketingPaths.includes(location.pathname)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setPaused(preference.matches)
    preference.addEventListener('change', change)
    return () => preference.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!location.hash) return
    const frame = requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: paused ? 'instant' : 'smooth' }))
    return () => cancelAnimationFrame(frame)
  }, [location, paused])
  const isCreate = location.pathname === '/create' || location.pathname === '/start'
  return <MotionContext.Provider value={{ paused, toggle: () => setPaused((value) => !value) }}>
    <div className={`app-shell ${editor ? 'editor-shell' : 'studio-shell'} ${marketing ? 'marketing-shell' : (isCreate ? 'studio-shell create-shell' : 'workspace-shell')}${location.pathname !== '/' ? ' interior-shell' : ''}`} data-motion={paused ? 'paused' : 'running'}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      {!editor && <AmbientBackground />}
      {!editor && <TopNav />}
      <main id="main-content" className="app-main" role="main">
        <div key={location.pathname} className={`app-route route-${location.pathname.split('/')[1] || 'home'}`}>
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-center" toastOptions={{ style: { background: 'var(--color-bg-3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-0)', fontSize: '13px' } }} />
      <ShortcutsModal />
    </div>
  </MotionContext.Provider>
}

