import { api } from './api'
import { authToken } from '@/store/authStore'

const KEY_STORAGE = 'sitebuilder-gemini-key'
const MODEL = 'gemini-3-flash-preview'

export interface AiMessage { role: 'user' | 'assistant'; text: string }

/** Thrown when no AI is reachable: no personal key and not signed in. Callers fall back to their own local answer. */
export class AiUnavailableError extends Error {
  constructor() { super('AI is not available. Sign in, or add a Gemini key in Settings.'); this.name = 'AiUnavailableError' }
}

let serverStatus: { at: number; available: Promise<boolean> } | null = null

/** Whether the server has an AI key. Asked at most once a minute, and a failed ask counts as "no". */
export function serverHasAi(now = Date.now()): Promise<boolean> {
  if (!serverStatus || now - serverStatus.at > 60_000) {
    serverStatus = { at: now, available: api.aiStatus().then((status) => status.available, () => false) }
  }
  return serverStatus.available
}

/**
 * One question to the AI, answered as JSON text. A personal key from Settings goes straight to Gemini;
 * otherwise a signed-in visitor uses the server's key, so there is nothing to set up.
 */
export async function askAi(system: string, messages: AiMessage[], options: { temperature?: number; signal?: AbortSignal } = {}): Promise<string> {
  const temperature = options.temperature ?? 0.5
  const key = localStorage.getItem(KEY_STORAGE)
  if (key) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      signal: options.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.text }] })),
        generationConfig: { responseMimeType: 'application/json', temperature },
      }),
    })
    if (!response.ok) throw new Error(`AI request failed (${response.status}). Check your API key or try again.`)
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string' || !text) throw new Error('The AI sent an empty answer. Please try again.')
    return text
  }
  if (!authToken() || !(await serverHasAi())) throw new AiUnavailableError()
  const { text } = await api.aiComplete({ system, messages, temperature }, options.signal)
  return text
}
