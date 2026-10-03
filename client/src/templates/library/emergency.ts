import { lightTheme, type RealTemplate } from './types'

/**
 * The one starting design that is part of the app itself.
 *
 * Every other layout template comes from the database. This is only what a site
 * is built from when nothing else can be: the API cannot be reached while
 * someone presses "Build this", or an AI answer turned out unusable. It is small
 * on purpose, and a person can change every part of it in the editor.
 */
export const emergencyTemplate: RealTemplate = {
  id: 'starter',
  name: 'My website',
  description: 'A simple starting point: a header, a few sections and a footer',
  category: 'professional',
  source: 'built in',
  theme: lightTheme({}),
  header: [{ type: 'navbar', variant: 'default', props: { logo: 'My website', links: ['Home', 'About', 'Services', 'Contact'], ctaText: 'Get in touch' } }],
  home: [
    { type: 'hero', variant: 'minimal', props: { headline: 'Welcome to our website', subheadline: 'Tell visitors what you do and who you do it for.', primaryCta: 'Get in touch', secondaryCta: 'Learn more' } },
    { type: 'content', variant: 'prose', props: { body: '## About us\n\nWrite a few lines about your story, your work and what makes you different.\n\n' } },
    { type: 'contact', variant: 'form', props: { title: 'Get in touch', subtitle: '' } },
  ],
  pages: [],
  footer: [{ type: 'footer', variant: 'multi-column', props: { logo: 'My website', description: 'A simple website.', autoPageLinks: true } }],
}
