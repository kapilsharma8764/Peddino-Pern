import { MessageCircle } from 'lucide-react'
import type { BlockConfig } from '../types'
import { whatsappHref, whatsappNumber } from './link'

/**
 * The floating WhatsApp button.
 *
 * For a great many small businesses WhatsApp is the enquiry channel, well
 * ahead of a contact form, so this exists as its own widget rather than as a
 * footer link. The number comes from the Create Website form, where the owner
 * ticks that their mobile is on WhatsApp.
 */


export function WhatsappBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const raw = typeof props.number === 'string' ? props.number : ''
  const countryCode = typeof props.countryCode === 'string' ? props.countryCode : '91'
  const label = typeof props.label === 'string' && props.label ? props.label : 'Chat with us'
  const message = typeof props.message === 'string' ? props.message : ''
  const side = props.side === 'left' ? 'left' : 'right'

  const number = whatsappNumber(raw, countryCode)

  // Without a number the button would go nowhere, so it simply does not appear
  // — a dead button on a live site is worse than a missing one.
  if (!number) return null

  const href = whatsappHref(number, message)

  if (block.variant === 'inline') {
    return (
      <section className="px-6 @md:px-10 py-10 text-center">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#25D366] text-white font-semibold hover:brightness-95 transition-all"
        >
          <MessageCircle size={17} />
          {label}
        </a>
      </section>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`fixed bottom-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#25D366] text-white font-semibold shadow-lg hover:brightness-95 transition-all ${
        side === 'left' ? 'left-5' : 'right-5'
      }`}
    >
      <MessageCircle size={18} />
      <span data-edit="label" className="hidden @md:inline">{label}</span>
    </a>
  )
}
