import { describe, expect, it } from 'vitest'
import { effectiveStyle, styleToCss, styleToRules } from '@/blocks/block-style'
import { exportSiteToHTML } from '@/lib/export-html'

describe('shared advanced styles', () => {
  it('cascades spacing, position and visibility into export media rules', () => {
    const style = { marginLeft: 12, position: 'sticky' as const, top: 10, hidden: true, mobile: { hidden: false, marginLeft: 0 } }
    expect(styleToCss(effectiveStyle(style, 'mobile'))).toMatchObject({ display: 'block', marginLeft: '0px', position: 'sticky', top: '10px' })
    expect(styleToRules(style, '.test')).toContain('@media (max-width:767px)')
    const html = exportSiteToHTML({ name: 'Responsive', blocks: [{ id: 'visible-mobile', type: 'heading', variant:'default',props:{text:'Mobile only',cssClasses:'my-heading'},style }] })
    expect(html).toContain('Mobile only'); expect(html).toContain('my-heading')
  })
})
