import { createContext, useContext } from 'react'
import type { SiteRegion } from './types'

/**
 * Whether a widget is being drawn on the editing canvas or somewhere else.
 *
 * The same renderers draw the canvas, the gallery's small previews and the
 * full-size preview dialog. Only the canvas should grow selection outlines,
 * drag handles and drop targets — a preview that could be dragged around
 * would be a lie, and a gallery card sprouting handles on hover is noise.
 *
 * A widget cannot ask "am I in the canvas" from its props, because it may sit
 * several containers deep and nothing threads that down. So the canvas
 * announces itself here, and anything that needs to know reads it.
 */
export interface CanvasInfo {
  /** Which part of the site is being drawn — null when this is not the canvas. */
  region: SiteRegion | null
  /** True while something is being dragged, when landing places should exist. */
  dragging: boolean
}

export const CanvasContext = createContext<CanvasInfo>({ region: null, dragging: false })

export function useCanvas(): CanvasInfo {
  return useContext(CanvasContext)
}
