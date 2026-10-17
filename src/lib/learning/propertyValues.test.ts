import { expect, it } from 'vitest'
import { convertProperty, inferProperty, isDateValue, matchesProperty, propertyKey, removeProperty, renameProperty } from './propertyValues'
it('preserves false, zero, empty values, null and opaque structures during unrelated edits',()=>{
 const values={zero:0,flag:false,empty:'',list:[],nil:null,custom:{nested:[1,'x']}}
 const renamed=renameProperty(values,{},'empty','Tên riêng')
 expect(renamed.values).toEqual({zero:0,flag:false,list:[],nil:null,custom:{nested:[1,'x']},'Tên riêng':''})
 expect(values.empty).toBe('')
 expect(inferProperty(values.nil)).toBeNull()
 expect(inferProperty(values.custom)).toBeNull()
 expect(removeProperty(values,{},'zero').values).not.toHaveProperty('zero')
})
it('rejects reserved, blank and colliding keys without deleting old data',()=>{
 for(const key of ['',' _memnova_page_id ','_fsrs_due','revision','pageId']) expect(()=>propertyKey(key)).toThrow()
 expect(propertyKey('  Chủ đề  ')).toBe('Chủ đề')
 expect(()=>renameProperty({a:1,b:2},{},'a','b')).toThrow()
 expect(()=>renameProperty({a:1},{},'missing','new')).toThrow()
})
it('validates Gregorian dates without timezone rollover',()=>{
 expect(isDateValue('2028-02-29')).toBe(true)
 for(const value of ['2026-02-29','2026-02-30','2026-13-01','18/10/2026']) expect(isDateValue(value)).toBe(false)
})
it('converts only without silently losing information',()=>{
 expect(convertProperty('false',{valueKind:'boolean'})).toBe(false)
 expect(convertProperty('0',{valueKind:'number'})).toBe(0)
 expect(convertProperty(false,{valueKind:'text'})).toBe('false')
 expect(convertProperty('a,b',{valueKind:'list',itemKind:'text'})).toEqual(['a,b'])
 for(const value of ['','001','1e3','NaN']) expect(()=>convertProperty(value,{valueKind:'number'})).toThrow()
 expect(()=>convertProperty({opaque:true},{valueKind:'text'})).toThrow()
})
it('recognizes stable page references only under an explicit matching hint',()=>{
 const value={pageId:'11111111-1111-4111-8111-111111111111',label:'Lesson'}
 expect(inferProperty(value)).toBeNull()
 expect(matchesProperty(value,{valueKind:'page'})).toBe(true)
 expect(matchesProperty([value],{valueKind:'list',itemKind:'page'})).toBe(true)
 expect(matchesProperty({...value,extra:true},{valueKind:'page'})).toBe(false)
 expect(matchesProperty({pageId:'some-title'},{valueKind:'page'})).toBe(false)
 expect(matchesProperty([null,'text'],{valueKind:'list',itemKind:'text'})).toBe(false)
})
it('does not mistake inherited object members for stored property definitions',()=>{
 const result=renameProperty({toString:'user value'},{},'toString','custom')
 expect(result.values).toEqual({custom:'user value'})
 expect(result.definitions).toEqual({})
})
