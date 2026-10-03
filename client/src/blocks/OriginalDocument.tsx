import { useContext, useEffect, useMemo, useRef } from 'react'
import type { BlockConfig } from './types'
import { EditableContext } from './editable-context'
import { CanvasContext } from './canvas-context'
import { useEditorStore } from '@/store/editorStore'

/** Opaque-origin sandbox: theme scripts can animate their own page, never access the builder. */
export function OriginalDocument({ block }: { block: BlockConfig }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const context = useContext(EditableContext)
  const canvas = useContext(CanvasContext)
  const previewMode = useEditorStore(state => state.previewMode)
  const selectBlock = useEditorStore(state => state.selectBlock)
  const sourceUrl = String(block.props.sourceUrl ?? '')
  const document = useMemo(() => {
    const html = String(block.props.html ?? '')
    const base = /^https?:\/\//.test(sourceUrl) ? new URL('.', sourceUrl).href : ''
    const marker = JSON.stringify(block.id).replaceAll('<', '\\u003c')
    const safeBase = base.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    const withoutBase = html.replace(/<base\b[^>]*>/gi, '')

    const doc = new DOMParser().parseFromString(withoutBase, 'text/html')
    const preloaderSelectors = '#preloader,#preloader-wrapper,#preload,#loading,#loader,#ftco-loader,#world-load,.preloader,.preloader-wrapper,.preloader-body,.pre-loader,.preload,.preload-content,.page-loader,.page-loader-wrapper,.animationload,.cssload-container,.spinner-wrapper,.loading-overlay,.se-pre-con,.pageloader,.pace,.pace-running,.fullscreen-loader,.load-screen,.loader,.loader-bg,.loader-inner,.gtco-loader,.colorlib-loader,.fh5co-loader,section.preloader,.line-scale-pulse-out,.ball-pulse,.ball-clip-rotate-pulse'
    doc.querySelectorAll(preloaderSelectors).forEach(el => el.remove())

    if (doc.body) {
      doc.body.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload')
      doc.body.style.opacity = ''
      doc.body.style.visibility = ''
      doc.body.style.display = ''
    }
    if (doc.documentElement) {
      doc.documentElement.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload', 'no-js')
      doc.documentElement.classList.add('js', 'ss-loaded')
    }

    if (safeBase) {
      const baseEl = doc.createElement('base')
      baseEl.href = safeBase
      doc.head.prepend(baseEl)
    }

    const style = doc.createElement('style')
    style.textContent = `${preloaderSelectors}{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important}html,body{opacity:1!important;visibility:visible!important}html.ss-preload .home-content__main,.home-content__main{opacity:1!important;visibility:visible!important}`
    doc.head.append(style)

    const bridge = `<script>(function(){var key=${marker};document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href&&!a.getAttribute('href').startsWith('#')){e.preventDefault();parent.postMessage({type:'original-link',key:key,url:a.href},'*');}});})();</script>`

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML + bridge
  }, [block.id, block.props.html, sourceUrl])

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow || event.data?.key !== block.id) return
      if (event.data.type === 'original-link' && typeof event.data.url === 'string') {
        const target = context?.pages.find(page => page.blocks.some(candidate => candidate.props.sourceUrl === event.data.url.split('#')[0]))
        if (target) context?.onPage?.(target.id)
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [block.id, context])

  return (
    <div style={{ background: '#fff' }}>
      {canvas && !previewMode && (
        <div style={{ padding: '46px 14px 10px', background: '#17151f', color: '#d8c5fb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span>Original template · HTML / CSS</span>
          <button type="button" onClick={() => selectBlock(block.id)} style={{ padding: '6px 12px', border: '1px solid #6f568b', borderRadius: 5, cursor: 'pointer' }}>Edit HTML / CSS</button>
        </div>
      )}
      <iframe
        ref={ref}
        title={String(block.props.title || 'Original template')}
        sandbox="allow-scripts"
        srcDoc={document}
        style={{ display: 'block', width: '100%', height: 'min(900px, calc(100dvh - 190px))', minHeight: 460, border: 0, background: '#fff' }}
      />
    </div>
  )
}
