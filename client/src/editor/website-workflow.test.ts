// @vitest-environment jsdom
import { expect,it } from 'vitest'
import { originalModel,patchOriginal,moveOriginalNode } from './original-model'
it('persists size and font styling and reorders without losing content',()=>{
 const html='<html><body><section><h1>First</h1></section><section><h2>Second</h2></section></body></html>'
 const model=originalModel(html);const id=model.sections[0].id
 const resized=patchOriginal(html,id,{width:'80%',height:'240',fontFamily:'Georgia',fontWeight:'700'})
 expect(resized).toContain('width: 80%');expect(resized).toContain('height: 240px')
 expect(resized).toContain('font-family: Georgia')
 const moved=moveOriginalNode(resized,id,1)
 expect(moved.indexOf('Second')).toBeLessThan(moved.indexOf('First'))
 expect(moved).not.toContain('data-builder-node')
})
