import { ImageOff, Package } from 'lucide-react'
import type { BlockConfig } from '../types'

/**
 * Product information — what the business sells, with a picture and a price.
 *
 * The pricing widget covers plans and tiers; this covers items on a shelf and
 * jobs on a price list, which is what most shops and trades actually need.
 *
 * The price is free text on purpose. A shop writes "₹499", a builder writes
 * "From ₹15,000", a salon writes "₹300 onwards" — forcing a number would make
 * all three wrong.
 */

interface Product {
  image?: string
  name?: string
  description?: string
  price?: string
  badge?: string
}

function readProducts(raw: unknown): Product[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row): row is Product => Boolean(row) && typeof row === 'object')
    .filter((row) => row.name || row.image)
}

function Picture({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="w-full h-full grid place-items-center bg-bg-2">
        <ImageOff size={16} className="text-text-3" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" />
}

export function ProductsBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const title = typeof props.title === 'string' ? props.title : ''
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : ''
  const products = readProducts(props.items)

  if (products.length === 0) {
    return (
      <section className="px-6 @md:px-10 py-12">
        <div className="max-w-md mx-auto text-center rounded-xl border border-border-default bg-bg-2 py-10">
          <Package size={18} className="mx-auto text-text-3" />
          <p className="mt-2 text-sm text-text-2">Add what you sell</p>
        </div>
      </section>
    )
  }

  const heading = (title || subtitle) && (
    <div className="text-center mb-8">
      {title && <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight">{title}</h2>}
      {subtitle && <p data-edit="subtitle" className="mt-2 text-sm text-text-2">{subtitle}</p>}
    </div>
  )

  // A price list reads better as rows; a shop reads better as cards.
  if (block.variant === 'list') {
    return (
      <section className="px-6 @md:px-10 py-12 @md:py-16">
        {heading}
        <div className="max-w-2xl mx-auto rounded-xl border border-border-default overflow-hidden">
          {products.map((product, index) => (
            <div
              key={index}
              className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
            >
              {product.image && (
                <div className="el-fit-cover el-fit-cover--square w-12 h-12 shrink-0 rounded-lg">
                  <Picture src={product.image} alt={product.name ?? ''} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-0">{product.name}</p>
                {product.description && (
                  <p className="text-[12.5px] text-text-2 leading-snug">{product.description}</p>
                )}
              </div>
              {product.price && (
                <span className="shrink-0 text-sm font-semibold text-text-0">{product.price}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      {heading}
      <div className="max-w-5xl mx-auto grid gap-5 @md:grid-cols-2 @2xl:grid-cols-3">
        {products.map((product, index) => (
          <div
            key={index}
            className="rounded-xl border border-border-default bg-bg-1 overflow-hidden flex flex-col"
          >
            <div className="el-fit-cover el-fit-cover--4x3">
              <Picture src={product.image} alt={product.name ?? ''} />
              {product.badge && (
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-semibold">
                  {product.badge}
                </span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-sm font-semibold text-text-0">{product.name}</h3>
              {product.description && (
                <p className="mt-1 text-[12.5px] text-text-2 leading-relaxed flex-1">
                  {product.description}
                </p>
              )}
              {product.price && (
                <p className="mt-3 text-base font-bold text-text-0">{product.price}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
