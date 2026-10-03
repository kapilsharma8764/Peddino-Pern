import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestEditorPlan, validateEditorPlan } from './editor-assistant'
const context = { selectedId:'n1', nodes:[{id:'n1',label:'Heading',text:'Welcome',kind:'text'},{id:'n2',label:'Other',text:'Other',kind:'text'}] }
describe('editor assistant action validation',()=>{
 it('accepts a scoped edit',()=>expect(validateEditorPlan({actions:[{kind:'edit',id:'n1',patch:{text:'New heading'}}]},context).actions).toHaveLength(1))
 it('rejects editing outside the selection',()=>expect(()=>validateEditorPlan({actions:[{kind:'edit',id:'n2',patch:{text:'Unexpected'}}]},context)).toThrow())
 it('rejects unsupported patches',()=>expect(()=>validateEditorPlan({actions:[{kind:'edit',id:'n1',patch:{html:'<script></script>'}}]},context)).toThrow())
 it('rejects unknown widgets',()=>expect(()=>validateEditorPlan({actions:[{kind:'add',type:'not-a-widget'}]},context)).toThrow())
 it('permits clarification without changing the page',()=>expect(validateEditorPlan({message:'Which heading?',actions:[]},context).actions).toEqual([]))
})

describe('editor assistant prompts', () => {
 afterEach(() => vi.unstubAllGlobals())
 it('changes a selected font size without a provider key', async () => {
  const plan = await requestEditorPlan('Set font size to 32px', context, new AbortController().signal)
  expect(plan.actions).toEqual([{kind:'edit',id:'n1',patch:{fontSize:'32'}}])
 })
 it('asks for a selection instead of resizing an arbitrary element', async () => {
  await expect(requestEditorPlan('Set font size to 32px', {...context,selectedId:null}, new AbortController().signal)).rejects.toThrow('Select')
 })
 it('rejects a font size that would make text disappear', async () => {
  await expect(requestEditorPlan('Set font size to 0', context, new AbortController().signal)).rejects.toThrow('between')
 })
 it('does not replace all the content of a section with a text patch', () => {
  expect(() => validateEditorPlan({actions:[{kind:'edit',id:'n1',patch:{text:'Oops'}}]}, {...context,nodes:[{...context.nodes[0],kind:'section'}]})).toThrow('text item')
 })
 it('supports the inspector appearance options in AI plans', () => {
  expect(validateEditorPlan({actions:[{kind:'edit',id:'n1',patch:{fontFamily:'Georgia',fontWeight:'700',width:'80%',margin:'20px',borderRadius:'12px'}}]},context).actions).toHaveLength(1)
 })
 it('does not execute an already cancelled quick action', async () => {
  const controller = new AbortController(); controller.abort()
  await expect(requestEditorPlan('Add FAQ', context, controller.signal)).rejects.toThrow()
 })
 it('sends page context and recent conversation for follow-up requests', async () => {
  vi.stubGlobal('localStorage',{getItem:()=> 'test-key'})
  const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({message:'Updated',actions:[{kind:'edit',id:'n1',patch:{color:'#123456'}}]})}]}}]})})
  vi.stubGlobal('fetch',fetch)
  await requestEditorPlan('Make it darker', {...context,websiteName:'Burnout',pageName:'Home'}, new AbortController().signal, [{role:'user',text:'Use a blue heading'},{role:'assistant',text:'Heading updated'}])
  const body = JSON.parse(fetch.mock.calls[0][1].body)
  expect(body.contents.map((item: {role:string})=>item.role)).toEqual(['user','model','user'])
  expect(body.systemInstruction.parts[0].text).toContain('Burnout')
  expect(body.systemInstruction.parts[0].text).toContain('fontFamily')
 })
})
