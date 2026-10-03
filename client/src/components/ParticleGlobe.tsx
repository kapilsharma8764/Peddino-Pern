import { useEffect, useRef } from 'react'

interface ParticleGlobeProps {
  /** How many points make up the sphere's surface. */
  count?: number
  /** CSS colour for every dot. Defaults to the app's brand colour. */
  color?: string
  className?: string
}

/**
 * A slowly spinning sphere made of many small dots, drawn on a canvas.
 *
 * Purely decorative. Points sit on a sphere (a Fibonacci sphere, which spaces
 * them evenly without clumping at the poles the way a latitude/longitude grid
 * does) and rotate around the vertical axis; each dot's size and opacity come
 * from how far toward the viewer it currently is, which is what reads as
 * depth and turns a scatter of points into something like a dust cloud rather
 * than a flat ring.
 */
export function ParticleGlobe({ count = 900, color, className = '' }: ParticleGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const points: { x: number; y: number; z: number }[] = []
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = i * Math.PI * (3 - Math.sqrt(5))
      // A touch of jitter keeps the surface from reading as a set of neat
      // rings once it stops spinning — real dust never lines up that evenly.
      const jitter = 1 + (Math.sin(i * 12.9898) * 0.5 + 0.5) * 0.06
      points.push({ x: Math.cos(theta) * radius * jitter, y, z: Math.sin(theta) * radius * jitter })
    }

    const dotColor = color ?? getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim() ?? '#ffffff'

    let angle = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    function size() {
      const canvasEl = canvasRef.current
      return canvasEl ? canvasEl.getBoundingClientRect().width : 0
    }

    function resize() {
      const canvasEl = canvasRef.current
      if (!canvasEl) return
      const cssSize = size()
      canvasEl.width = cssSize * dpr
      canvasEl.height = cssSize * dpr
    }

    function draw() {
      const canvasEl = canvasRef.current
      if (!ctx || !canvasEl) return
      const cssSize = canvasEl.width / dpr
      const cx = canvasEl.width / 2
      const cy = canvasEl.height / 2
      const sphereRadius = cssSize * dpr * 0.47

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)

      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      const projected = points
        .map(({ x, y, z }) => {
          const rx = x * cos - z * sin
          const rz = x * sin + z * cos
          return { sx: cx + rx * sphereRadius, sy: cy + y * sphereRadius, z: rz }
        })
        .sort((a, b) => a.z - b.z)

      for (const point of projected) {
        const depth = (point.z + 1) / 2
        ctx.beginPath()
        ctx.arc(point.sx, point.sy, (0.4 + depth * 1.3) * dpr, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.globalAlpha = 0.12 + depth * 0.7
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    resize()
    draw()

    if (reduceMotion) return

    let raf = 0
    let previousTime: number | undefined
    function loop(time: number) {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50)
      previousTime = time
      // One full turn every ten seconds, independent of display refresh rate.
      angle = (angle + elapsed * (Math.PI * 2 / 10000)) % (Math.PI * 2)
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      resize()
      draw()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [count, color])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`aspect-square ${className}`}
    />
  )
}
