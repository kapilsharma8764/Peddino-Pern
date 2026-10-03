import { createContext } from 'react'
import type { BlockConfig, Breakpoint, PageConfig } from './types'

export const EditableContext = createContext<{
  block: BlockConfig; pages: PageConfig[]; viewport?: Breakpoint;
  /** The page being drawn, when it is not the one open in the editor (an exported page). */
  activePageId?: string;
  base?: string; asFiles?: boolean; onPage?: (id: string) => void;
} | null>(null)
