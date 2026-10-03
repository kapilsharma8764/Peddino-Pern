import { describe, expect, it } from 'vitest'
import { templates, buildTemplate } from '@/templates/library'
import { exportSitePages } from './export-html'
import type { SiteConfig } from '@/blocks/types'

const coursely = () => buildTemplate(templates.find((t) => t.id === 'coursely-elearning')!)

describe('exporting a multi-page template', () => {
  it('writes one file per page with the shared header and footer on each', () => {
    const files = exportSitePages(coursely(), { fileLinks: true })
    expect(files.map((f) => f.file)).toEqual(['index.html', 'about.html', 'courses.html', 'course-detail.html', 'instructors.html', 'faq.html', 'contact.html'])
    for (const file of files) {
      expect(file.html).toContain('Coursely')
      expect(file.html).toContain('href="about.html"')
      expect(file.html).toContain('href="contact.html"')
    }
  })

  it('points buttons that were linked by page id at the right file', () => {
    const home = exportSitePages(coursely(), { fileLinks: true })[0].html
    // "Browse Courses" in the header and hero opens the courses page.
    expect(home).toMatch(/href="courses\.html"[^>]*>[\s\S]{0,300}Browse Courses/)
  })

  it('keeps a link working when its page is renamed', () => {
    const site = coursely()
    const courses = site.pages!.find((p) => p.name === 'Courses')!
    courses.name = 'Programs'
    courses.path = '/programs'
    const home = exportSitePages(site, { fileLinks: true })[0].html
    expect(home).toContain('href="programs.html"')
  })

  it('applies page colours to that page only, and header colours to every page', () => {
    const site: SiteConfig = coursely()
    site.pages!.find((p) => p.name === 'About')!.colors = { background: '#fff3cd', text: '#222222' }
    site.header = site.header!.map((b) => ({ ...b, colors: { overrides: { background: '#112233' } } }))
    site.theme = { ...site.theme, accent: '#ff0000' }
    const files = exportSitePages(site, { fileLinks: true })
    const about = files.find((f) => f.file === 'about.html')!.html
    const home = files.find((f) => f.file === 'index.html')!.html
    expect(about).toContain('data-page-colors')
    expect(about).toContain('--color-bg-1:#fff3cd')
    expect(home).not.toContain('data-page-colors')
    expect(about).toContain('#112233')
    expect(home).toContain('#112233')
    expect(home).toContain('#ff0000')
  })
})
