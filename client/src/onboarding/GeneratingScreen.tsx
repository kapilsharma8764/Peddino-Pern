import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

const STAGES = [
  'Saving your details',
  'Matching your category to a design',
  'Preparing your template gallery',
  'Almost there',
]

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * The transition between the form and the template gallery.
 *
 * There is no server-side build to poll here — finishing this wizard just
 * saves the profile and hands off to the template chooser, where the actual
 * site gets built once a design is picked. The checklist below stages on
 * timers rather than real progress, but it still never marks the last row
 * done before `onFinish` (the real, synchronous save) has actually resolved.
 */
export function GeneratingScreen({
  onFinish,
  onDone,
  reduced,
}: {
  onFinish: () => void | Promise<void>
  onDone: () => void
  reduced: boolean
}) {
  const [active, setActive] = useState(0)
  const [completeCount, setCompleteCount] = useState(0)
  const [failed, setFailed] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    async function run() {
      setFailed(null)
      setCompleteCount(0)
      const stageMs = reduced ? 120 : 620
      for (let i = 0; i < STAGES.length - 1; i++) {
        if (cancelledRef.current) return
        setActive(i)
        await delay(stageMs)
        if (cancelledRef.current) return
        setCompleteCount(i + 1)
      }
      if (cancelledRef.current) return
      setActive(STAGES.length - 1)
      try {
        await onFinish()
        if (cancelledRef.current) return
        setCompleteCount(STAGES.length)
        await delay(reduced ? 80 : 320)
        if (!cancelledRef.current) onDone()
      } catch (error) {
        if (!cancelledRef.current) {
          setFailed(error instanceof Error ? error.message : 'Something went wrong while finishing up.')
        }
      }
    }
    void run()
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const progress = completeCount / STAGES.length
  const ringCirc = 100

  return (
    <div className="create-generating" role="status">
      <div className="create-ring" aria-hidden="true">
        <svg viewBox="0 0 40 40" width={72} height={72}>
          <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-border-default)" strokeWidth="3" />
          <circle
            cx="20"
            cy="20"
            r="17"
            fill="none"
            stroke={failed ? 'var(--color-status-red)' : 'var(--color-brand)'}
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={ringCirc}
            strokeDasharray={ringCirc}
            strokeDashoffset={ringCirc - progress * ringCirc}
            style={{ transition: reduced ? 'none' : 'stroke-dashoffset 420ms var(--ease-out)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
      </div>

      <p className="create-generating-bar" aria-hidden="true">
        <span style={{ width: `${progress * 100}%`, transition: reduced ? 'none' : 'width 420ms var(--ease-out)' }} />
      </p>

      <p className="sr-only" aria-live="polite">
        {failed ? `Failed: ${failed}` : completeCount === STAGES.length ? 'Ready.' : STAGES[active]}
      </p>

      <ul className="create-checklist">
        {STAGES.map((label, i) => {
          const state = failed && i === active ? 'error' : i < completeCount ? 'done' : i === active ? 'active' : 'inactive'
          return (
            <li key={label} className={`create-check-row create-check-${state}`}>
              <span className="create-check-mark" aria-hidden="true">
                {state === 'done' ? (
                  <svg viewBox="0 0 24 24" width={13} height={13}>
                    <path
                      d="M4 12l5 5L20 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={0}
                      style={{ transition: reduced ? 'none' : 'stroke-dashoffset 400ms var(--ease-out)' }}
                    />
                  </svg>
                ) : state === 'error' ? (
                  <AlertTriangle size={12} />
                ) : (
                  <span className="create-check-dot" />
                )}
              </span>
              {label}
            </li>
          )
        })}
      </ul>

      {failed && (
        <div className="create-generating-error">
          <p>{failed}</p>
          <button type="button" className="create-btn create-btn-accent" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
