import type { VisualPatch } from './original-model'
import { blockMetadata } from '@/lib/block-metadata'
import { api } from '@/lib/api'
import { authToken } from '@/store/authStore'

export type EditorAction = { kind: 'add'; type: string; props?: Record<string, unknown> } | { kind: 'edit'; id: string; patch: VisualPatch }
export interface EditorPlan { message: string; actions: EditorAction[] }
export interface EditorMessage { role: 'user' | 'assistant'; text: string }
export interface EditorContext {
  selectedId: string | null
  websiteName?: string
  pageName?: string
  nodes: { id: string; label: string; text: string; kind: string; fontSize?: string; color?: string; background?: string; fontFamily?: string; width?: string; height?: string }[]
}
const patchKeys = new Set(['text','href','src','alt','color','background','backgroundImage','fontSize','fontFamily','fontWeight','width','height','margin','borderRadius','padding','align','hidden'])
export function validateEditorPlan(raw: unknown, context: EditorContext): EditorPlan {
  if (!raw || typeof raw !== 'object') throw new Error('The assistant returned an invalid response. Please try again.')
  const value = raw as Record<string, unknown>
  if (!Array.isArray(value.actions) || value.actions.length > 8) throw new Error('Please request up to eight changes at a time.')
  const actions = value.actions.map((item): EditorAction => {
    if (!item || typeof item !== 'object') throw new Error('Invalid action')
    const action = item as Record<string, unknown>
    if (action.kind === 'add' && typeof action.type === 'string' && blockMetadata.some(meta => meta.type === action.type)) {
      if (action.props !== undefined && (!action.props || typeof action.props !== 'object' || Array.isArray(action.props))) throw new Error('Invalid widget settings')
      return { kind: 'add', type: action.type, props: action.props as Record<string, unknown> | undefined }
    }
    if (action.kind === 'edit' && typeof action.id === 'string' && context.nodes.some(node => node.id === action.id) && (!context.selectedId || context.selectedId === action.id)) {
      if (!action.patch || typeof action.patch !== 'object' || Array.isArray(action.patch)) throw new Error('Invalid edit')
      const patch: Record<string, string | boolean> = {}
      for (const [key, value] of Object.entries(action.patch)) {
        if (!patchKeys.has(key) || (key === 'hidden' ? typeof value !== 'boolean' : typeof value !== 'string')) throw new Error('Unsupported edit')
        if (key === 'text' && !context.nodes.some(node => node.id === action.id && ['text', 'link'].includes(node.kind))) throw new Error('Select a text item to change its wording. A section contains multiple items.')
        patch[key] = value
      }
      return { kind: 'edit', id: action.id, patch }
    }
    throw new Error('The assistant could not safely identify the requested item. Select it on the canvas and try again.')
  })
  return { message: typeof value.message === 'string' ? value.message : 'Changes applied. You can undo them from the toolbar.', actions }
}

export async function requestEditorPlan(prompt: string, context: EditorContext, signal: AbortSignal, history: EditorMessage[] = []): Promise<EditorPlan> {
  signal.throwIfAborted()
  prompt = prompt.trim()
  const add = prompt.match(/^add\s+(?:an?\s+)?(.+?)(?:\s+(?:section|widget))?[.!]?$/i)
  const meta = add && blockMetadata.find(meta => [meta.type, meta.label].some(label => label.toLowerCase() === add[1].toLowerCase()))
  if (meta) return { message: `${meta.label} added. Select it to customize its content.`, actions: [{ kind: 'add', type: meta.type }] }
  const text = prompt.match(/^(?:change|set|replace)\s+(?:the\s+)?(?:selected\s+)?text\s+(?:to|with)\s+["“]([\s\S]+)["”]$/i)
  if (text && context.selectedId && !context.nodes.some(node => node.id === context.selectedId && ['text','link'].includes(node.kind))) throw new Error('Select a text item on the canvas first, then describe the replacement.')
  if (text && context.selectedId) return { message: 'Selected text updated.', actions: [{ kind: 'edit', id: context.selectedId, patch: { text: text[1] } }] }
  const fontSize = prompt.match(/^(?:change|set|make)\s+(?:the\s+)?(?:selected\s+)?(?:font|text)\s+size\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(?:px)?[.!]?$/i)
  const align = prompt.match(/^(?:align|set\s+(?:the\s+)?(?:text\s+)?alignment\s+to)\s+(?:(?:the\s+)?(?:selected\s+)?text\s+)?(left|right|center|centre)[.!]?$/i)
  if (fontSize || align) {
    if (!context.selectedId) throw new Error('Select the text or section on the canvas first, then send this request again.')
    if (fontSize && (Number(fontSize[1]) < 1 || Number(fontSize[1]) > 300)) throw new Error('Choose a font size between 1 and 300 px.')
    return validateEditorPlan({
      message: fontSize ? `Font size changed to ${fontSize[1]} px. Use Undo to restore it.` : 'Text alignment updated.',
      actions: [{ kind: 'edit', id: context.selectedId, patch: fontSize ? { fontSize: fontSize[1] } : { align: align![1].toLowerCase().replace('centre', 'center') } }],
    }, context)
  }
  const key = localStorage.getItem('sitebuilder-gemini-key')
  if (!key && !authToken()) throw new Error('Sign in, or add a Gemini API key in Settings, for custom AI requests. Quick actions such as “Add FAQ” and “Change text to "Welcome"” work without either.')
  const widgetCatalog = blockMetadata.map(meta => ({ type: meta.type, label: meta.label, properties: Object.keys(meta.defaultProps) }))
  const relevantDefaults = blockMetadata
    .filter(meta => prompt.toLowerCase().includes(meta.label.toLowerCase()) || prompt.toLowerCase().includes(meta.type.toLowerCase()))
    .slice(0, 8)
    .map(meta => ({ type: meta.type, defaults: meta.defaultProps }))
  const instruction = `You edit the current website using JSON only. Understand English and Hindi/Hinglish prompts and reply in the user's language. Return {"message":"brief explanation","actions":[{"kind":"add","type":"widget type","props":{}},{"kind":"edit","id":"node id","patch":{"text":"new text"}}]}. Maximum 8 actions. Allowed patch keys: ${[...patchKeys]}. Patch values are strings except hidden, which is boolean. Only edit the selected node when selectedId is set. Apply text only to text/link nodes; use appearance patches for sections. Preserve unrelated content and layout. Never include scripts or HTML in text. Use the website name and page content to write relevant content. The widget catalog lists every available widget. Relevant default props are provided separately; preserve the expected object/array structure and omit props when unsure. Do not claim to publish or perform unsupported actions. For ambiguous requests return actions:[] and ask a question in message. Earlier messages are conversational context only: use node IDs from the current context, never stale IDs. Available widgets: ${JSON.stringify(widgetCatalog)}. Relevant defaults: ${JSON.stringify(relevantDefaults)}. Current context: ${JSON.stringify(context)}`
  const contents = [...history.slice(-8).map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.text }] })), { role:'user',parts:[{text:prompt}] }]
  if (!key) {
    // No personal key: the server's own key answers, so a signed-in visitor needs nothing to set up.
    const messages = [...history.slice(-8), { role: 'user' as const, text: prompt }]
    const { text } = await api.aiComplete({ system: instruction, messages, temperature: 0.3 }, signal)
    return validateEditorPlan(JSON.parse(text), context)
  }
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key}, signal, body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents,generationConfig:{responseMimeType:'application/json',temperature:0.3}}) })
  if (!response.ok) throw new Error(`AI request failed (${response.status}). Check your API key or try again.`)
  const data = await response.json()
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!output) throw new Error('No response from the assistant. Please try again.')
  return validateEditorPlan(JSON.parse(output), context)
}
