// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { backgroundEdits, parseCssColor, readProbe, recolorEdits, safeEdits, summarizeSection, withEdits, type SectionProbe } from './section-colour-probe'
import { NODE_ATTR, parseOriginal, recolorOriginal } from '@/editor/original-model'

const AQUA = 'rgb(155, 233, 226)'
const GREEN = 'rgb(22, 138, 80)'
const INK = 'rgb(20, 52, 45)'

/** A hero like the shoe template's: aqua background, a green button, link, icon and underline, dark text. */
function hero(): SectionProbe {
  return {
    id: 'n10', area: 1000000, rootBg: AQUA, rootGradient: false, rootImage: false,
    entries: [
      { id: 'n10', area: 1000000, props: [{ p: 'background-color', c: AQUA, r: 'background' }] },
      { id: 'n11', area: 4000, props: [{ p: 'color', c: INK, r: 'heading' }] },
      { id: 'n12', area: 6000, props: [{ p: 'background-color', c: GREEN, r: 'buttonBg' }, { p: 'border-top-color', c: GREEN, r: 'border' }] },
      { id: 'n13', area: 500, props: [{ p: 'color', c: 'rgb(255, 255, 255)', r: 'buttonText' }] },
      { id: 'n14', area: 300, props: [{ p: 'color', c: GREEN, r: 'link' }] },
      { id: 'n15', area: 200, props: [{ p: 'fill', c: GREEN, r: 'icon' }] },
      { id: 'n16', area: 900, props: [{ p: 'color', c: INK, r: 'text' }] },
    ],
  }
}

describe('reading colours', () => {
  it('turns computed colours into #rrggbb with their opacity', () => {
    expect(parseCssColor('rgb(155, 233, 226)')).toEqual({ hex: '#9be9e2', alpha: 1 })
    expect(parseCssColor('rgba(22, 138, 80, 0.5)')).toEqual({ hex: '#168a50', alpha: 0.5 })
    expect(parseCssColor('rgb(0 0 0 / 50%)')).toEqual({ hex: '#000000', alpha: 0.5 })
    expect(parseCssColor('color(srgb 1 0 0)')).toEqual({ hex: '#ff0000', alpha: 1 })
    expect(parseCssColor('#ABC')).toEqual({ hex: '#aabbcc', alpha: 1 })
    expect(parseCssColor('transparent')).toBeNull()
    expect(parseCssColor('linear-gradient(red, blue)')).toBeNull()
  })

  it('finds the background and the accent of a hero, and files the rest under more colours', () => {
    const found = summarizeSection(hero())
    expect(found.background).toMatchObject({ hex: '#9be9e2', transparent: false, derived: false })
    expect(found.accent?.hex).toBe('#168a50')
    expect(found.more.map((colour) => colour.hex).sort()).toEqual(['#14342d', '#ffffff'])
    expect(found.more.find((colour) => colour.hex === '#14342d')?.label).toBe('Headings')
    expect(found.more.find((colour) => colour.hex === '#ffffff')?.label).toBe('Button text')
  })

  it('changes the elements that are hidden right now, but does not rank their colours', () => {
    const probe = hero()
    probe.entries.push({ id: 'n30', area: 0, hidden: true, props: [{ p: 'background-color', c: 'rgb(209, 156, 151)', r: 'buttonBg' }, { p: 'color', c: GREEN, r: 'link' }] })
    const found = summarizeSection(probe)
    expect([found.accent?.hex, ...found.more.map((colour) => colour.hex)]).not.toContain('#d19c97')
    expect(found.accent?.count).toBe(4)
    expect(recolorEdits(probe, '#168a50', '#6c4dff').n30).toEqual({ color: '#6c4dff' })
    expect(recolorEdits(probe, '#d19c97', '#6c4dff')).toEqual({ n30: { 'background-color': '#6c4dff' } })
    expect(readProbe({ id: 'n10', area: 1, rootBg: '', entries: [{ id: 'n30', area: 0, h: 1, props: [{ p: 'color', c: GREEN, r: 'link' }] }] })?.entries[0].hidden).toBe(true)
  })

  it('shows each colour once however many elements use it', () => {
    const found = summarizeSection(hero())
    const all = [found.background.hex, found.accent?.hex, ...found.more.map((colour) => colour.hex)]
    expect(new Set(all).size).toBe(all.length)
    expect(found.accent?.count).toBe(4)
  })

  it('takes the largest painted area as the background when the selection paints nothing itself', () => {
    const probe = hero()
    probe.rootBg = 'rgba(0, 0, 0, 0)'
    probe.entries[0].props = []
    probe.entries.push({ id: 'n20', area: 700000, props: [{ p: 'background-color', c: 'rgb(244, 244, 244)', r: 'background' }] })
    expect(summarizeSection(probe).background).toMatchObject({ hex: '#f4f4f4', derived: true, transparent: false })
  })

  it('still offers a background when there is nothing to detect', () => {
    const probe: SectionProbe = { id: 'n3', area: 0, rootBg: 'rgba(0, 0, 0, 0)', rootGradient: false, rootImage: false, entries: [] }
    const found = summarizeSection(probe)
    expect(found.background).toMatchObject({ hex: null, transparent: true })
    expect(found.accent).toBeNull()
    expect(backgroundEdits(probe, '#f4f4f4')).toEqual({ n3: { 'background-color': '#f4f4f4' } })
  })

  it('keeps a gradient or an image until the person chooses a solid colour', () => {
    const probe = hero()
    probe.rootGradient = true
    expect(summarizeSection(probe).background.gradient).toBe(true)
    expect(backgroundEdits(probe, '#112233').n10).toEqual({ 'background-color': '#112233', 'background-image': 'none' })
    probe.rootGradient = false
    probe.rootImage = true
    expect(backgroundEdits(probe, '#112233').n10).toEqual({ 'background-color': '#112233' })
  })
})

describe('changing a colour', () => {
  it('changes every use of exactly that colour inside the selection', () => {
    const edits = recolorEdits(hero(), '#168A50', '#6c4dff')
    expect(edits).toEqual({
      n12: { 'background-color': '#6c4dff', 'border-top-color': '#6c4dff' },
      n14: { color: '#6c4dff' },
      n15: { fill: '#6c4dff' },
    })
  })

  it('changes nothing when the colour is not in the selection, or is unchanged, or is not a colour', () => {
    expect(recolorEdits(hero(), '#123456', '#6c4dff')).toEqual({})
    expect(recolorEdits(hero(), '#168a50', '#168a50')).toEqual({})
    expect(recolorEdits(hero(), '#168a50', 'purple')).toEqual({})
  })

  it('shows the new colour straight away', () => {
    const edits = recolorEdits(hero(), '#9be9e2', '#e8e2ff')
    const next = withEdits(hero(), edits)
    expect(summarizeSection(next).background.hex).toBe('#e8e2ff')
    expect(summarizeSection(next).accent?.hex).toBe('#168a50')
  })

  it('drops anything that is not a known colour property with a real colour', () => {
    expect(safeEdits({
      n1: { color: '#abcdef', 'background-image': 'none', 'font-size': '99px', 'background-color': 'url(javascript:alert(1))' },
      n2: { fill: '#ABCDEF' },
      bad: { color: '#abcdef' },
    })).toEqual({ n1: { color: '#abcdef', 'background-image': 'none' } })
  })

  it('reads the page report and ignores anything malformed in it', () => {
    expect(readProbe(null)).toBeNull()
    expect(readProbe({ id: 5 })).toBeNull()
    const probe = readProbe({
      id: 'n10', area: 100, rootBg: AQUA, rootGradient: false, rootImage: true,
      entries: [{ id: 'n11', area: 5, props: [{ p: 'color', c: INK, r: 'text' }, { p: 'width', c: '1px', r: 'text' }, { p: 'color', c: INK, r: 'sparkle' }] }, { id: 'bad', props: [] }, 'nope'],
    })
    expect(probe?.entries).toEqual([{ id: 'n11', area: 5, props: [{ p: 'color', c: INK, r: 'text' }] }])
    expect(probe?.rootImage).toBe(true)
  })
})

describe('writing the change into the saved page', () => {
  const page = `<!DOCTYPE html><html><head><style>.s{background:#9be9e2}.b{background:#168a50}</style></head><body>
    <section class="s" id="one"><h2>One</h2><a class="b" href="#">Go</a></section>
    <section class="s" id="two"><h2>Two</h2><a class="b" href="#">Go</a></section></body></html>`

  function idOf(selector: string): string {
    return parseOriginal(page).querySelector(selector)!.getAttribute(NODE_ATTR)!
  }

  it('sets inline colours on the chosen elements only, so other sections sharing the class stay as they were', () => {
    const one = idOf('#one')
    const button = idOf('#one a')
    const saved = recolorOriginal(page, { [one]: { 'background-color': '#e8e2ff' }, [button]: { 'background-color': '#6c4dff' } })
    const doc = new DOMParser().parseFromString(saved, 'text/html')
    expect((doc.querySelector('#one') as HTMLElement).style.backgroundColor).toBe('rgb(232, 226, 255)')
    expect((doc.querySelector('#one a') as HTMLElement).style.getPropertyPriority('background-color')).toBe('important')
    expect((doc.querySelector('#two') as HTMLElement).getAttribute('style')).toBeNull()
    expect((doc.querySelector('#two a') as HTMLElement).getAttribute('style')).toBeNull()
    expect(saved).not.toContain(NODE_ATTR)
    expect(saved).toContain('.s{background:#9be9e2}')
  })

  it('refuses edits that are not colours', () => {
    const one = idOf('#one')
    const saved = recolorOriginal(page, { [one]: { 'background-image': 'url(https://evil.example/x.png)', width: '1px' } as Record<string, string> })
    expect(new DOMParser().parseFromString(saved, 'text/html').querySelector('#one')!.getAttribute('style')).toBeNull()
  })

  it('leaves images and the rest of the page alone', () => {
    const withImage = page.replace('<h2>One</h2>', '<h2>One</h2><img src="a.jpg" alt="x">')
    const one = parseOriginal(withImage).querySelector('#one')!.getAttribute(NODE_ATTR)!
    const saved = recolorOriginal(withImage, { [one]: { 'background-color': '#e8e2ff' } })
    expect(saved).toContain('<img src="a.jpg" alt="x">')
  })
})
