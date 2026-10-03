import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Sparkles, Plus, Palette, CircleHelp, X, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { EditorMessage } from './editor-assistant'

interface Props { selection?: string; onClear: () => void; onAdd: () => void; onDesign: () => void; onSubmit: (prompt: string, signal: AbortSignal, history: EditorMessage[]) => Promise<string> }
export function EditorAssistant({ selection, onClear, onAdd, onDesign, onSubmit }: Props) {
 const name = useAuthStore(s => s.user?.name?.split(' ')[0] || 'there')
 const [prompt,setPrompt] = useState('')
 const [messages,setMessages] = useState<EditorMessage[]>([])
 const [busy,setBusy] = useState(false)
 const controller = useRef<AbortController | null>(null)
 const bottom = useRef<HTMLDivElement>(null)
 useEffect(() => () => controller.current?.abort(), [])
 useEffect(() => { bottom.current?.scrollIntoView({block:'nearest'}) }, [messages,busy])
 async function send() {
  if (!prompt.trim() || busy) return
  const text = prompt.trim(); setPrompt('');setBusy(true)
  setMessages(items => [...items,{role:'user',text}])
  const request = new AbortController();controller.current=request
  const timer = window.setTimeout(() => request.abort(),45000)
  try { const reply = await onSubmit(text,request.signal,messages);setMessages(items => [...items,{role:'assistant',text:reply}]) }
  catch(error) { setMessages(items => [...items,{role:'assistant',text:request.signal.aborted ? 'Request stopped. No changes applied.' : error instanceof Error ? error.message : 'Could not apply this request.'}]) }
  finally { clearTimeout(timer);setBusy(false);controller.current=null }
 }
 return <section className="studio-assistant" aria-label="AI assistant">
  <header><strong>Site Assistant</strong><span>AI</span></header>
  <div className="assistant-conversation" role="log" aria-live="polite">
   {!messages.length && <div className="assistant-welcome"><div className="assistant-orb"><Sparkles size={24}/></div><h2>Hello {name}</h2><p>What can I help you create?</p><div className="assistant-shortcuts"><button onClick={() => setPrompt('Create a compelling hero section for this website')}><Sparkles size={17}/>Generate</button><button onClick={onAdd}><Plus size={17}/>Add</button><button onClick={onDesign}><Palette size={17}/>Design</button><button onClick={() => setMessages([{role:'assistant',text:'Use Add on the left to browse Elements, Sections and Pages. Select text or a section on the canvas, then describe your change here. Try Add FAQ, or Change text to "Welcome". Use Undo to revert a change.'}])}><CircleHelp size={17}/>How to?</button></div></div>}
   {messages.map((message,index)=><div key={index} className={`assistant-message ${message.role}`}>{message.text}</div>)}
   {busy && <div className="assistant-message assistant"><Loader2 className="animate-spin" size={16}/> Working on your request...</div>}<div ref={bottom}/>
  </div>
  <form className="assistant-composer" onSubmit={e=>{e.preventDefault();void send()}}>
   {selection && <div className="assistant-selection">{selection}<button type="button" aria-label="Clear selected context" onClick={onClear}><X size={13}/></button></div>}
   <textarea aria-label="Ask Site Assistant" placeholder={selection?'Describe a change to this selection...':'Ask me to add or change something...'} value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/>
   <div><button type="button" aria-label="Add to website" onClick={onAdd}><Plus size={20}/></button><Link to="/settings">AI settings</Link>{busy?<button type="button" onClick={()=>controller.current?.abort()}>Stop</button>:<button type="submit" aria-label="Send prompt" disabled={!prompt.trim()}><ArrowUp size={19}/></button>}</div>
  </form>
 </section>
}
