import { useEffect, useRef, useState } from 'react'

/**
 * Drives the "AI-assist" choreography shared by Suggest one / Write a first
 * draft: a short busy pause (these suggestions are computed locally and
 * return instantly, so without one the button would flicker), then the
 * result typed into the field a few characters at a time, then a single
 * border flash to mark it landed.
 *
 * `onChange` is called on every keystroke of the type-in so it works with a
 * plain controlled field — the caller does not need to know this is
 * animated rather than typed by a person.
 */
export function useAIAssist(onChange: (value: string) => void) {
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  function run(getText: () => string, reduced: boolean) {
    if (busy) return
    if (reduced) {
      onChange(getText())
      return
    }
    setBusy(true)
    const thinking = window.setTimeout(() => {
      const text = getText()
      setBusy(false)
      onChange('')
      let i = 0
      const step = () => {
        i += 1
        onChange(text.slice(0, i))
        if (i < text.length) {
          timers.current.push(window.setTimeout(step, 14))
        } else {
          setFlash(true)
          timers.current.push(window.setTimeout(() => setFlash(false), 420))
        }
      }
      step()
    }, 500)
    timers.current.push(thinking)
  }

  return { busy, flash, run }
}
