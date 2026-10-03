import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { initBuilder } from '@/builder/core'
import { api } from '@/lib/api'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'
import { starterDesignById, useWebsiteTypeMap } from '@/store/catalogStore'
import { BusinessInfoForm } from './BusinessInfoForm'
import { businessInfoErrors } from './business-info'
import { DesignStyleSelector } from './DesignStyleSelector'
import { OnboardingShell } from './OnboardingShell'
import { PageSelector } from './PageSelector'
import { WebsiteTypeSelector } from './WebsiteTypeSelector'
import { useOnboardingStore, type StartMode } from './onboardingStore'
import { buildStarterSite } from './starter-designs'

/**
 * The setup before the editor opens, one component for both paths.
 *
 *   /start/template/{type, details}   then the template gallery (/templates?from=start)
 *   /start/build/{type, details, design, pages}   then the editor, built from the choices
 *
 * The first two screens are shared, so a change to the website-type or business-details
 * screen reaches both paths.
 */

const TEMPLATE_STEPS = ['Website type', 'Business details', 'Choose template', 'Preview']
const BUILD_STEPS = ['Website type', 'Business details', 'Choose design', 'Pages', 'Build']
const ORDER: Record<StartMode, string[]> = { template: ['type', 'details'], builder: ['type', 'details', 'design', 'pages'] }

export function StartFlow() {
  const { flow, step } = useParams()
  const navigate = useNavigate()
  const mode: StartMode | null = flow === 'template' ? 'template' : flow === 'build' ? 'builder' : null
  const typeId = useOnboardingStore((s) => s.typeId)
  const designId = useOnboardingStore((s) => s.designId)
  const pages = useOnboardingStore((s) => s.pages)
  const setType = useOnboardingStore((s) => s.setType)
  const setDesign = useOnboardingStore((s) => s.setDesign)
  const setPages = useOnboardingStore((s) => s.setPages)
  const websiteTypeMap = useWebsiteTypeMap()
  const profile = useBusinessStore((s) => s.profile)
  const updateProfile = useBusinessStore((s) => s.update)
  const [showErrors, setShowErrors] = useState(false)
  const [building, setBuilding] = useState(false)

  if (!mode || !step || !ORDER[mode].includes(step)) return <Navigate to="/start" replace />
  // A refresh on a later screen must not skip the questions it depends on.
  if (step !== 'type' && !typeId) return <Navigate to={`/start/${flow}/type`} replace />

  const type = typeId ? websiteTypeMap.get(typeId) : undefined
  const steps = mode === 'template' ? TEMPLATE_STEPS : BUILD_STEPS
  const go = (to: string) => navigate(`/start/${flow}/${to}`)

  function chooseType(id: string) {
    const picked = websiteTypeMap.get(id)
    if (!picked) return
    const changed = id !== typeId
    setType(id)
    updateProfile({ category: picked.category, websiteType: picked.websiteType, offer: picked.category === 'education' ? null : profile.offer ?? 'services' })
    // New type, new suggestions; ticking is the client's, so only reset when the type really changed.
    if (changed) { setPages(picked.pages); setDesign(null) }
  }

  async function createSite() {
    const design = designId ? starterDesignById(designId) : undefined
    if (!design || building) return
    setBuilding(true)
    try {
      const config = buildStarterSite(design, profile, pages)
      initBuilder(config)
      usePublishStore.getState().clear()
      try {
        const created = await api.createSite({ name: config.name, config, profile })
        usePublishStore.getState().setSite(created.id)
      } catch { /* The editor keeps working offline. */ }
      useBusinessStore.getState().complete()
      toast(`${config.name} is ready to build`)
      navigate('/editor')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the site. Please try again.')
    } finally { setBuilding(false) }
  }

  if (step === 'type') {
    return (
      <OnboardingShell steps={steps} current={0} wide
        title={mode === 'template' ? 'What kind of website are you building?' : 'What kind of website do you want to create?'}
        subtitle={mode === 'template' ? 'Choose a category so we can show templates designed for your business.' : 'Choose a category and we will suggest designs and pages that suit it.'}
        onBack={() => navigate('/start')} onContinue={() => go('details')} canContinue={Boolean(typeId)}>
        <WebsiteTypeSelector value={typeId} onChange={chooseType} />
      </OnboardingShell>
    )
  }

  if (step === 'details') {
    const next = () => {
      setShowErrors(true)
      if (Object.keys(businessInfoErrors(profile)).length) return
      if (mode === 'builder') { go('design'); return }
      // Types without a category of their own browse the whole collection, ranked by keyword.
      navigate(`/templates?from=start${type?.category === 'other' ? '&category=all' : ''}`)
    }
    return (
      <OnboardingShell steps={steps} current={1}
        title="Tell us about your business" subtitle="We use this to fill in your website. You can change everything later."
        onBack={() => go('type')} onContinue={next} continueLabel={mode === 'template' ? 'Continue to Templates' : 'Continue to Design'}>
        <BusinessInfoForm typeName={type?.name ?? ''} onChangeType={() => go('type')} showErrors={showErrors} />
      </OnboardingShell>
    )
  }

  if (step === 'design') {
    return (
      <OnboardingShell steps={steps} current={2} wide
        title="Choose how your website should look" subtitle="This sets the header, colours, footer and the sections on your home page. Every part stays editable."
        onBack={() => go('details')} onContinue={() => go('pages')} canContinue={Boolean(designId)}>
        <DesignStyleSelector value={designId} onChange={setDesign} recommended={type?.designs ?? []} />
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell steps={steps} current={3}
      title="Which pages do you need?" subtitle="Home is always included. We will create each page and add it to your menu."
      onBack={() => go('design')} onContinue={() => void createSite()} continueLabel={building ? 'Creating…' : 'Create my site'} canContinue={Boolean(designId)} busy={building}>
      <PageSelector value={pages} onChange={setPages} />
    </OnboardingShell>
  )
}
