import { EditableAction } from '../EditableAction'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import type { BlockConfig } from '../types'
import { sliderSlides } from './slides'

/**
 * The front slider — the first widget the brief names.
 *
 * A photograph across the width with a heading and a button on it, cycling
 * through several. It is what most small-business sites open with, and it is
 * the one thing the widget library was missing.
 *
 * Written without a carousel library: the whole behaviour is an index, a
 * timer and two buttons, and a dependency for that would weigh more than the
 * rest of the page.
 */

export function SliderBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const slides = sliderSlides(props.slides)
  const autoplay = props.autoplay !== false
  const seconds = Math.max(2, Number(props.interval) || 6)
  const height = Number(props.height) || 520

  const [index, setIndex] = useState(0)

  // Clamp rather than reset: deleting the last slide while it is showing
  // should step back, not jump the viewer to the beginning.
  const current = slides.length === 0 ? 0 : Math.min(index, slides.length - 1)

  useEffect(() => {
    if (!autoplay || slides.length < 2) return
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % slides.length)
    }, seconds * 1000)
    return () => clearInterval(timer)
  }, [autoplay, seconds, slides.length])

  if (slides.length === 0) {
    return (
      <section className="px-6 @md:px-10 py-12">
        <div
          className="max-w-4xl mx-auto grid place-items-center rounded-xl border border-border-default bg-bg-2 text-center"
          style={{ height: 240 }}
        >
          <div>
            <ImageOff size={18} className="mx-auto text-text-3" />
            <p className="mt-2 text-sm text-text-2">Add a slide to start the slider</p>
          </div>
        </div>
      </section>
    )
  }

  const step = (by: number) => setIndex((value) => (value + by + slides.length) % slides.length)

  return (
    <section className="relative overflow-hidden" style={{ height: `${height}px` }}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          // Only the current slide is visible, and the rest are hidden from
          // screen readers so the page is not read out several times over.
          style={{ opacity: i === current ? 1 : 0, pointerEvents: i === current ? undefined : 'none' }}
          aria-hidden={i === current ? undefined : true}
        >
          {slide.image ? (
            <img src={slide.image} alt={slide.heading} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand/25 to-bg-3" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          <div className="absolute inset-0 flex items-center">
            <div className="px-6 @md:px-14 max-w-2xl">
              {slide.heading && (
                <h2 data-edit={`slides.${i}.heading`} className="text-3xl @md:text-5xl font-bold tracking-tight leading-[1.08] text-white">
                  {slide.heading}
                </h2>
              )}
              {slide.text && (
                <p data-edit={`slides.${i}.text`} className="mt-3 text-white/85 text-base @md:text-lg leading-relaxed">
                  {slide.text}
                </p>
              )}
              {slide.buttonText && (
                <EditableAction path={`slides.${i}.buttonText`} urlPath={`slides.${i}.buttonUrl`} label={`Slide ${i+1} Button`}
                  className="mt-6 inline-flex items-center px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-colors"
                >
                </EditableAction>
              )}
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white grid place-items-center hover:bg-black/55 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 text-white grid place-items-center hover:bg-black/55 transition-colors backdrop-blur-sm"
          >
            <ChevronRight size={17} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
