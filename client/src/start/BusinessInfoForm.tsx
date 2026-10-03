import { useRef, useState } from 'react'
import { ImageIcon, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { useBusinessStore } from '@/store/businessStore'
import { ImageReadError, readImageAsDataUrl } from '@/onboarding/read-image'
import { businessInfoErrors } from './business-info'
import { writeBusinessCopy } from '@/onboarding/write-with-ai'

const field = 'create-input w-full'
const label = 'create-label block'

/**
 * The business details, written into the shared business profile — the same one the
 * template gallery and the editor already read, so nothing is asked twice and nothing
 * is copied.
 */
export function BusinessInfoForm({ typeName, onChangeType, showErrors }: { typeName: string; onChangeType: () => void; showErrors: boolean }) {
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)
  const updateContact = useBusinessStore((s) => s.updateContact)
  const fileInput = useRef<HTMLInputElement>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const errors = showErrors ? businessInfoErrors(profile) : {}

  /** Drafts what the visitor left empty; anything they already typed is kept. */
  async function writeForMe() {
    if (!profile.name.trim()) { toast('Enter your business name first, so the text can be about you.'); return }
    setWriting(true)
    try {
      const { copy, source } = await writeBusinessCopy(profile, typeName)
      const patch: Partial<typeof profile> = {}
      if (!profile.about.trim()) patch.about = copy.about
      if (!profile.slogan.trim()) patch.slogan = copy.slogan
      if (!profile.services.trim() && copy.services) patch.services = copy.services
      if (!(profile.ctaText ?? '').trim() && copy.ctaText) patch.ctaText = copy.ctaText
      update(patch)
      const filled = Object.keys(patch).length
      toast(filled ? `${filled} field${filled === 1 ? '' : 's'} filled${source === 'ai' ? ' by AI' : ' from built-in suggestions'}. Edit anything you like.` : 'Everything is already filled in, so your own text was kept.')
      if (source === 'local') toast('Sign in, or add a Gemini key in Settings, for text written just for your business.')
    } finally { setWriting(false) }
  }

  async function chooseLogo(file: File | undefined) {
    if (!file) return
    try { update({ logo: await readImageAsDataUrl(file) }); setLogoError(null) }
    catch (error) { setLogoError(error instanceof ImageReadError ? error.message : 'Could not read that image') }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Website / Business name <span className="text-red-500">*</span>
          <input className={`${field} mt-2`} value={profile.name} maxLength={80} placeholder="Bright Future Academy" autoComplete="organization" aria-invalid={Boolean(errors.name)} onChange={(event) => update({ name: event.target.value })} />
          {errors.name && <span role="alert" className="create-error-message">{errors.name}</span>}
        </label>
        <div>
          <span className={label}>Business type / category <span className="text-red-500">*</span></span>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm" data-testid="chosen-type">
            <span className="font-medium text-slate-900">{typeName}</span>
            <button type="button" onClick={onChangeType} className="text-[12px] font-semibold text-[#7C3AED] hover:underline">Change</button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3" data-testid="write-for-me">
        <p className="text-sm text-slate-700"><b className="font-semibold text-slate-900">Not sure what to write?</b> We can draft the description, tagline, services and button for you.</p>
        <button type="button" onClick={() => void writeForMe()} disabled={writing} className="create-btn create-btn-ghost-accent inline-flex items-center gap-1.5"><Sparkles size={14} />{writing ? 'Writing…' : 'Write it for me'}</button>
      </div>

      <label className={label}>Short description <span className="text-red-500">*</span>
        <textarea className={`${field} mt-2`} rows={3} value={profile.about} placeholder="Modern English-medium school providing education from nursery to class 12." aria-invalid={Boolean(errors.about)} onChange={(event) => update({ about: event.target.value })} />
        {errors.about && <span role="alert" className="create-error-message">{errors.about}</span>}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Tagline <span className="font-normal text-slate-400">(optional)</span>
          <input className={`${field} mt-2`} value={profile.slogan} placeholder="Learning Today, Leading Tomorrow" onChange={(event) => update({ slogan: event.target.value })} />
        </label>
        <label className={label}>Main button text <span className="font-normal text-slate-400">(optional)</span>
          <input className={`${field} mt-2`} value={profile.ctaText ?? ''} placeholder="Apply for Admission" onChange={(event) => update({ ctaText: event.target.value })} />
        </label>
      </div>

      <label className={label}>Services <span className="font-normal text-slate-400">(optional, one per line)</span>
        <textarea className={`${field} mt-2`} rows={3} value={profile.services} placeholder={'Admissions\nClasses\nActivities\nTransport'} onChange={(event) => update({ services: event.target.value })} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>Email <span className="font-normal text-slate-400">(optional)</span>
          <input type="email" className={`${field} mt-2`} value={profile.contact.email} placeholder="hello@example.com" autoComplete="email" onChange={(event) => updateContact({ email: event.target.value })} />
        </label>
        <label className={label}>Phone <span className="font-normal text-slate-400">(optional)</span>
          <input type="tel" className={`${field} mt-2`} value={profile.contact.mobile} placeholder="+91 98765 43210" autoComplete="tel" onChange={(event) => updateContact({ mobile: event.target.value })} />
        </label>
      </div>

      <label className={label}>Address <span className="font-normal text-slate-400">(optional)</span>
        <input className={`${field} mt-2`} value={profile.contact.address} placeholder="12 Main Road" autoComplete="street-address" onChange={(event) => updateContact({ address: event.target.value })} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>City <span className="font-normal text-slate-400">(optional)</span>
          <input className={`${field} mt-2`} value={profile.city ?? ''} autoComplete="address-level2" onChange={(event) => update({ city: event.target.value })} />
        </label>
        <label className={label}>Country <span className="font-normal text-slate-400">(optional)</span>
          <input className={`${field} mt-2`} value={profile.country ?? ''} autoComplete="country-name" onChange={(event) => update({ country: event.target.value })} />
        </label>
      </div>

      <label className={label}>Social links <span className="font-normal text-slate-400">(optional, one per line)</span>
        <textarea className={`${field} mt-2`} rows={2} value={profile.social ?? ''} placeholder="https://instagram.com/yourpage" onChange={(event) => update({ social: event.target.value })} />
      </label>

      <div>
        <span className={label}>Logo <span className="font-normal text-slate-400">(optional)</span></span>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-400">
            {profile.logo ? <img src={profile.logo} alt="Your logo" className="h-full w-full object-contain" /> : <ImageIcon size={20} />}
          </span>
          <input ref={fileInput} type="file" accept="image/*" hidden aria-label="Upload logo" onChange={(event) => { void chooseLogo(event.target.files?.[0]); event.target.value = '' }} />
          <button type="button" onClick={() => fileInput.current?.click()} className="create-btn create-btn-ghost-accent">{profile.logo ? 'Replace logo' : 'Upload logo'}</button>
          {profile.logo && <button type="button" onClick={() => update({ logo: '', logoSquare: '' })} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900"><X size={12} />Remove</button>}
        </div>
        {logoError && <p role="alert" className="create-error-message">{logoError}</p>}
      </div>
    </form>
  )
}
