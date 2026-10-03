import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass } from 'lucide-react'
import { MarketingPage, PageHero } from '@/marketing/MarketingPage'

export function NotFound() {
  return (
    <MarketingPage title="Page not found" description="Find your way back to Peddino Site Builder.">
      <PageHero eyebrow="404 · PAGE NOT FOUND" title="Let’s get you" accent="back on track." lede="This page may have moved, or the address may be incomplete. Your next step is right here.">
        <div className="mk-cta-actions mt-7"><Link to="/" className="mk-btn mk-btn-primary"><ArrowLeft size={16} />Back to Home</Link><Link to="/help" className="mk-btn mk-btn-ghost">Visit the help centre <ArrowRight size={16} /></Link></div>
      </PageHero>
      <section className="studio-container mk-section"><div className="mk-empty"><Compass size={32} /><h3>Looking for your websites?</h3><p>Open your workspace to pick up where you left off.</p><Link to="/dashboard" className="mk-btn mk-btn-ghost">Your workspace <ArrowRight size={16} /></Link></div></section>
    </MarketingPage>
  )
}
