import { toast } from 'sonner'
import type { BlockConfig } from '../types'
import { Send } from 'lucide-react'

interface ContactProps {
  title?: string
  subtitle?: string
  nameLabel?: string
  phoneLabel?: string
  emailLabel?: string
  messageLabel?: string
  submitLabel?: string
}

export function ContactBlock({ block }: { block: BlockConfig }) {
  const props = block.props as unknown as ContactProps

  return (
    <section className="px-6 @md:px-10 py-16 @md:py-20">
      <div className="max-w-lg mx-auto">
        <div className="reveal-fade-up reveal-d1 text-center mb-8">
          <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight mb-2">
            {props.title || 'Get in Touch'}
          </h2>
          {props.subtitle && (
            <p data-edit="subtitle" className="text-text-2 text-sm">{props.subtitle}</p>
          )}
        </div>

        <div className="reveal-fade-up reveal-d2 space-y-4">
          <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
            <div>
              <label data-edit="nameLabel" className="block text-[11.5px] text-text-2 mb-1.5 font-medium">{props.nameLabel || 'Name'}</label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors"
              />
            </div>
            <div>
              <label data-edit="phoneLabel" className="block text-[11.5px] text-text-2 mb-1.5 font-medium">{props.phoneLabel || 'Phone'}</label>
              <input
                type="tel"
                placeholder="98765 43210"
                className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors"
              />
            </div>
          </div>
          <div>
            <label data-edit="emailLabel" className="block text-[11.5px] text-text-2 mb-1.5 font-medium">{props.emailLabel || 'Email'}</label>
            <input type="email" placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors" />
          </div>
          <div>
            <label data-edit="messageLabel" className="block text-[11.5px] text-text-2 mb-1.5 font-medium">{props.messageLabel || 'Message'}</label>
            <textarea
              rows={4}
              placeholder="How can we help?"
              className="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 resize-y transition-colors"
            />
          </div>
          <button
            onClick={() => toast("Message sent! We'll be in touch soon.")}
            className="w-full py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all hover:accent-glow-lg flex items-center justify-center gap-2"
          >
            <Send size={14} />
            <span data-edit="submitLabel">{props.submitLabel || 'Send Message'}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
