import type { BlockConfig, SiteConfig } from '@/blocks/types'
import { exportSiteToHTML } from '@/lib/export-html'

/** Isolate widget CSS and runtime from third-party template styles. */
export function widgetDocument(widget: BlockConfig, theme: SiteConfig['theme']): string {
  return exportSiteToHTML({ name: 'Widget', blocks: [widget], theme })
}

export function writeWidget(element: HTMLElement, widget: BlockConfig, theme: SiteConfig['theme'], height = 420) {
  element.dataset.studioWidget = JSON.stringify(widget)
  element.dataset.widgetLabel = String(widget.type)
  element.style.cssText = 'position:relative;width:100%;clear:both;'
  element.replaceChildren()
  const frame = element.ownerDocument.createElement('iframe')
  frame.title = `${widget.type} widget`
  frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups')
  frame.srcdoc = widgetDocument(widget, theme)
  frame.style.cssText = `display:block;width:100%;height:${height}px;border:0;background:white;`
  element.append(frame)
}
