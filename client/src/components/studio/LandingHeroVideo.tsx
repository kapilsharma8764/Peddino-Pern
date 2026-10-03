import { useEffect, useRef, type RefObject } from 'react'
import { useMotion } from './motion-context'
import studioHeroMotion from '@/assets/studio-hero-motion.mp4'
import '@/landing-hero-video.css'

/** A decorative, slow-moving layer behind the landing hero. */
export function LandingHeroVideo({ scrollRoot }: { scrollRoot: RefObject<HTMLDivElement | null> }) {
  const media = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const { paused } = useMotion()

  useEffect(() => {
    const root = scrollRoot.current
    const layer = media.current
    if (!root || !layer || paused) {
      layer?.style.setProperty('--hero-scroll-shift', '0px')
      return
    }

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        layer.style.setProperty('--hero-scroll-shift', `${Math.min(72, root.scrollTop * 0.14)}px`)
      })
    }
    update()
    root.addEventListener('scroll', update, { passive: true })
    return () => { root.removeEventListener('scroll', update); cancelAnimationFrame(frame) }
  }, [paused, scrollRoot])

  useEffect(() => {
    const element = video.current
    const layer = media.current
    if (!element || !layer) return
    element.playbackRate = 0.65
    if (paused) { element.pause(); return }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void element.play().catch(() => {})
      else element.pause()
    }, { root: scrollRoot.current, threshold: 0.01 })
    observer.observe(layer)
    return () => { observer.disconnect(); element.pause() }
  }, [paused, scrollRoot])

  return <div ref={media} className="studio-hero-motion" aria-hidden="true">
    <video ref={video} src={studioHeroMotion} autoPlay muted loop playsInline preload="auto" disablePictureInPicture />
  </div>
}
