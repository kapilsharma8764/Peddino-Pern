import type { WireRow } from './layouts'

/**
 * A small picture of a layout, so a client can see the shape before choosing it.
 * Each box is a place a widget will go; its tag (TEXT, IMAGE, CARD) is only a hint
 * for what usually goes there, not a requirement.
 */
export function Wireframe({ rows, header, footer, height }: { rows: WireRow[]; header?: boolean; footer?: boolean; height?: number }) {
  const bar = (label: string) => (
    <div className="flex h-3.5 items-center justify-center rounded-[3px] bg-text-3/25 text-[6.5px] font-semibold tracking-wider text-text-2">{label}</div>
  )
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border-default bg-bg-1 p-1.5" style={height ? { minHeight: height } : undefined} aria-hidden="true">
      {header && bar('HEADER')}
      {rows.map((row, r) => (
        <div key={r} className="flex flex-1 gap-1" style={{ minHeight: rows.length > 3 ? 14 : 20 }}>
          {row.map((cell, c) => (
            <div
              key={c}
              style={{ flex: `${cell.w} 1 0`, minWidth: 0 }}
              className={`flex items-center justify-center overflow-hidden rounded-[3px] border border-dashed text-[6.5px] font-semibold tracking-wide ${
                cell.fill === 'media'
                  ? 'border-brand/50 bg-brand/15 text-brand'
                  : cell.fill === 'form'
                    ? 'border-brand/40 bg-bg-3 text-text-2'
                    : 'border-text-3/40 bg-bg-2 text-text-3'
              }`}
            >
              {cell.tag}
            </div>
          ))}
        </div>
      ))}
      {footer && bar('FOOTER')}
    </div>
  )
}

/** A whole page as a stack of labelled bands, for the page structures. */
export function StructureWireframe({ bands }: { bands: { label: string; rows: WireRow[] }[] }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border-default bg-bg-1 p-1.5" aria-hidden="true">
      <div className="flex h-3 items-center justify-center rounded-[3px] bg-text-3/25 text-[6px] font-semibold tracking-wider text-text-2">HEADER</div>
      {bands.length === 0 && <div className="grid h-12 place-items-center rounded-[3px] border border-dashed border-text-3/40 text-[7px] text-text-3">EMPTY PAGE</div>}
      {bands.map((band, i) => {
        const cells = band.rows[0]?.length ?? 1
        return (
          <div key={i} className="flex gap-1" style={{ minHeight: 13 }}>
            {band.rows[0]?.map((cell, c) => (
              <div key={c} style={{ flex: `${cell.w} 1 0`, minWidth: 0 }} className="flex items-center justify-center overflow-hidden rounded-[3px] border border-dashed border-text-3/40 bg-bg-2 text-[6px] font-semibold uppercase tracking-wide text-text-3">
                {cells === 1 || c === 0 ? band.label : ''}
              </div>
            ))}
          </div>
        )
      })}
      <div className="flex h-3 items-center justify-center rounded-[3px] bg-text-3/25 text-[6px] font-semibold tracking-wider text-text-2">FOOTER</div>
    </div>
  )
}

/** A header drawn the way the real one looks: logo, menu, button. */
export function HeaderMock({ variant }: { variant: string }) {
  const logo = <span className="h-2.5 w-7 rounded-[3px] bg-brand/70" />
  const link = (n: number) => Array.from({ length: n }, (_, i) => <span key={i} className="h-1 w-5 rounded bg-text-3/60" />)
  const pipes = (n: number) => Array.from({ length: n }, (_, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <span className="h-2 w-px bg-text-3/60" />}<span className="h-1 w-5 rounded bg-text-3/60" /></span>)
  const cta = <span className="h-3 w-9 rounded-[3px] bg-brand" />
  const burger = <span className="flex flex-col gap-[2px]"><i className="block h-[1.5px] w-3 bg-text-2" /><i className="block h-[1.5px] w-3 bg-text-2" /><i className="block h-[1.5px] w-3 bg-text-2" /></span>
  const box = 'rounded-md border border-border-default bg-bg-1 px-2 py-2'
  switch (variant) {
    case 'split-center':
      return <div className={`${box} grid grid-cols-[auto_1fr_auto] items-center gap-2`}>{logo}<span className="flex justify-center gap-2">{link(3)}</span>{cta}</div>
    case 'stacked':
      return <div className={`${box} flex flex-col items-center gap-2`}>{logo}<span className="flex gap-2.5">{link(5)}</span></div>
    case 'stacked-pipes':
      return <div className={`${box} flex flex-col items-center gap-2`}>{logo}<span className="flex gap-2">{pipes(5)}</span></div>
    case 'centered':
      return <div className={`${box} flex items-center justify-between gap-2`}><span className="flex gap-2">{link(2)}</span>{logo}<span className="flex items-center gap-2">{link(2)}{cta}</span></div>
    case 'contact':
      return <div className={`${box} flex items-center justify-between gap-2`}>{logo}<span className="flex gap-2">{link(3)}</span><span className="flex items-center gap-1.5"><span className="h-1 w-8 rounded bg-text-2/70" />{cta}</span></div>
    case 'icons':
      return <div className={`${box} flex items-center justify-between gap-2`}>{logo}<span className="flex items-center gap-2">{link(3)}<span className="flex gap-1">{[0, 1, 2].map((n) => <i key={n} className="block h-2 w-2 rounded-full border border-text-2/70" />)}</span></span></div>
    case 'burger':
      return <div className={`${box} flex items-center justify-between gap-2`}>{logo}<span className="flex items-center gap-2">{link(2)}{burger}</span></div>
    case 'topbar':
      return <div className="overflow-hidden rounded-md border border-border-default bg-bg-1"><div className="flex items-center justify-between bg-bg-3 px-2 py-0.5"><span className="h-1 w-12 rounded bg-text-3/60" /><span className="h-1 w-8 rounded bg-text-3/60" /></div><div className="flex items-center justify-between gap-2 px-2 py-1.5">{logo}<span className="flex items-center gap-2">{link(3)}{cta}</span></div></div>
    default:
      return <div className={`${box} flex items-center justify-between gap-2`}>{logo}<span className="flex items-center gap-2">{link(4)}{cta}</span></div>
  }
}

/** A footer drawn roughly as the real one is laid out. */
export function FooterMock({ variant, columns = 3 }: { variant: string; columns?: number }) {
  const box = 'rounded-md border border-border-default bg-bg-1 p-2'
  const logo = <span className="block h-2.5 w-7 rounded-[3px] bg-brand/70" />
  const col = (k: number) => <span key={k} className="flex flex-col gap-1"><i className="block h-1 w-6 rounded bg-text-2/70" /><i className="block h-1 w-5 rounded bg-text-3/50" /><i className="block h-1 w-5 rounded bg-text-3/50" /></span>
  const bottom = <div className="mt-2 flex items-center justify-between border-t border-border-default pt-1"><i className="block h-1 w-12 rounded bg-text-3/50" /><i className="block h-1 w-8 rounded bg-text-3/50" /></div>
  switch (variant) {
    case 'centered':
      return <div className={`${box} flex flex-col items-center gap-1.5`}>{logo}<i className="block h-1 w-20 rounded bg-text-3/50" /><i className="block h-1 w-12 rounded bg-text-3/50" /></div>
    case 'inline':
      return <div className={box}><div className="flex items-center justify-between">{logo}<span className="flex gap-1.5">{[0, 1, 2].map((n) => <i key={n} className="block h-1 w-5 rounded bg-text-3/50" />)}</span><span className="flex gap-1">{[0, 1, 2].map((n) => <i key={n} className="block h-2 w-2 rounded-full bg-text-3/50" />)}</span></div><div className="mt-2 flex justify-center"><i className="block h-1 w-14 rounded bg-text-3/50" /></div></div>
    case 'columns':
    case 'newsletter':
      return <div className={box}>{variant === 'newsletter' && <div className="mb-2 flex items-center justify-between border-b border-border-default pb-1.5"><i className="block h-1.5 w-12 rounded bg-text-2/70" /><span className="flex gap-1"><i className="block h-3 w-10 rounded-[3px] border border-border-default" /><i className="block h-3 w-6 rounded-[3px] bg-brand" /></span></div>}<div className="flex gap-3"><span className="flex flex-col gap-1">{logo}<i className="block h-1 w-9 rounded bg-text-3/50" /></span>{Array.from({ length: columns }, (_, k) => col(k))}</div>{bottom}</div>
    case 'minimal':
      return <div className={`${box} flex justify-center`}><i className="block h-1 w-24 rounded bg-text-3/50" /></div>
    default:
      return <div className={box}><div className="flex items-center justify-between">{logo}<span className="flex gap-1.5">{[0, 1].map((n) => <i key={n} className="block h-1 w-5 rounded bg-text-3/50" />)}</span><i className="block h-1 w-9 rounded bg-text-3/50" /></div></div>
  }
}
