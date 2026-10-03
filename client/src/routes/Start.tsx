import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '@/start/onboardingStore'
import { ArrowRight, LayoutGrid, LayoutTemplate, Wand2 } from 'lucide-react'

/**
 * The first fork after "Get started": pick a ready-made template to edit,
 * or build a site from the 200+ drag-and-drop widgets via the business
 * profile wizard. Both paths end up in the same editor.
 */
export function Start() {
  const navigate = useNavigate()

  return (
    <div className="create-page min-h-full h-full overflow-y-auto bg-bg-0 text-text-0">
      <div className="create-start">
        <h1 className="create-heading">How do you want to start?</h1>
        <p className="create-done-sub">Both paths open the same drag-and-drop editor — you can always switch later.</p>

        <div className="create-done-paths create-start-paths">
          <button type="button" className="create-done-path create-start-path" onClick={() => { useOnboardingStore.getState().begin('template'); navigate('/start/template/type') }}>
            <LayoutTemplate size={22} />
            <h3>Choose a template</h3>
            <p>Pick your kind of website, tell us about your business, then choose a ready-made design to edit in the drag-and-drop editor.</p>
            <span className="create-btn create-btn-ghost-accent">
              Browse templates
              <ArrowRight size={15} />
            </span>
          </button>

          <button type="button" className="create-done-path create-start-path" onClick={() => { useOnboardingStore.getState().begin('builder'); navigate('/start/build/type') }}>
            <Wand2 size={22} />
            <h3>Create a site</h3>
            <p>Tell us about your business, choose a starting design and your pages, then build the rest with 200+ drag-and-drop widgets.</p>
            <span className="create-btn create-btn-accent">
              Start building
              <ArrowRight size={15} />
            </span>
          </button>
        </div>

        <button type="button" className="create-done-path create-start-path mt-4" onClick={() => navigate('/build')}>
          <LayoutGrid size={22} />
          <h3>Guided site builder</h3>
          <p>Pick a website type, choose a header and footer, set each page's layout, then fill the slots with widgets. Preview on desktop, tablet and mobile, then download the site.</p>
          <span className="create-btn create-btn-ghost-accent">
            Start guided builder
            <ArrowRight size={15} />
          </span>
        </button>
      </div>
    </div>
  )
}
