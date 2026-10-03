import '@/marketing/marketing.css'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { ArrowUpRight, Inbox, LayoutDashboard, LogOut, Pencil, Settings, Menu, X, Layers3 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { BRAND, marketingPages, marketingPaths } from '@/brand'
import { useState } from 'react'

const links = [
  { to: '/dashboard', label: 'Sites', icon: LayoutDashboard },
  { to: '/editor', label: 'Editor', icon: Pencil },
  { to: '/leads', label: 'Enquiries', icon: Inbox },
  { to: '/settings', label: 'Settings', icon: Settings },
]
export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const path = useLocation().pathname
  const marketing = marketingPaths.includes(path)
  return <header className={`studio-nav ${marketing ? 'marketing-nav' : 'workspace-nav'}`}>
    <Link to="/" className="studio-brand" onClick={() => setMobileOpen(false)}><span className="brand-mark"><Layers3 size={21} /></span><span className="mk-brand-text" aria-label={BRAND.name}><b>{BRAND.short}</b><span>{BRAND.tag}</span></span></Link>
    <nav className="studio-desktop-nav" aria-label="Main navigation">{marketing ? <><Link to="/features">Features</Link><Link to="/how-it-works">How it works</Link><Link to="/pricing">Pricing</Link><Link to="/about">About</Link><Link to="/help">Help</Link></> : links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon size={14} />{label}</NavLink>)}</nav>
    <div className="studio-nav-actions">
      {marketing ? <>{user ? <Link className="nav-login" to="/dashboard">My workspace</Link> : <Link className="nav-login" to="/sign-in">Log in</Link>}<Link className="studio-button nav-cta" to="/create">Start building <ArrowUpRight size={15} /></Link></> : user && <><span className="nav-account">{user.name || user.email}</span><button className="motion-toggle" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></>}
      <button className="studio-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="mobile-navigation">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <nav id="mobile-navigation" className="studio-mobile-nav" aria-label="Mobile navigation">{marketing ? <>{marketingPages.map((page) => <Link key={page.to} to={page.to} onClick={() => setMobileOpen(false)}>{page.label}</Link>)}<Link to="/sign-in" onClick={() => setMobileOpen(false)}>Your account</Link></> : links.map(({ to, label }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}>{label}</NavLink>)}</nav>}
  </header>
}
