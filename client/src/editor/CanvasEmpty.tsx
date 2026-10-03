import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { blockMetadata } from '@/lib/block-metadata'
import type { BlockConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import type { BlockType, SiteRegion } from '@/blocks/types'

export function CanvasEmpty() {
  const addBlock = useConfigStore((s) => s.addBlock)
  const selectBlock = useEditorStore((s) => s.selectBlock)

  function handleAddBlock(type: BlockType, region: SiteRegion) {
    const meta = blockMetadata.find((b) => b.type === type)!
    const block: BlockConfig = {
      id: newId('block'),
      type: meta.type,
      variant: meta.variants[0],
      props: structuredClone(meta.defaultProps),
    }
    useConfigStore.getState().setActiveRegion(region)
    addBlock(block)
    selectBlock(block.id)
    toast('Hero block added')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10 relative z-[1]">
      <h3 className="text-lg font-semibold text-text-1">Start building</h3>
      <p className="text-[13px] text-text-3 max-w-[360px] leading-relaxed">
        Add your first component from the library, or use the Components page to browse all blocks.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {([['navbar','header','Add header'],['hero','page','Add page content'],['footer','footer','Add footer']] as const).map(([type,region,label]) => <button
          key={region}
          onClick={() => handleAddBlock(type, region)}
          className="px-3.5 py-1.5 rounded-md bg-brand text-white text-[12.5px] font-semibold border border-brand hover:bg-brand-dim transition-colors flex items-center gap-1.5"
        ><Plus size={14} />{label}</button>)}
      </div>
    </div>
  )
}
