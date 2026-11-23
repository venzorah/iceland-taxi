import assert from 'node:assert/strict'
import test from 'node:test'
import { validateFields } from './validation'
import { noticeKind } from './feedback'
function field(value:string,required=true) {
 let custom='', focused=false, reported=false
 return {value,required,disabled:false,willValidate:true,dataset:{} as Record<string,string>,setCustomValidity:(text:string)=>{custom=text},checkValidity:()=>!custom,reportValidity:()=>{reported=true},focus:()=>{focused=true},get focused(){return focused},get reported(){return reported}}
}
test('required whitespace prevents submission and focuses the field; correcting it clears the error',()=>{
 const input=field('   '),optional=field('',false)
 const root={querySelectorAll:()=>[optional,input]} as unknown as HTMLElement
 assert.equal(validateFields(root),false);assert(input.focused&&input.reported)
 input.value='Complete name';assert.equal(validateFields(root),true)
})
test('disabled/optional controls do not become mandatory',()=>{
 const optional=field('',false),disabled=field('');disabled.disabled=true
 assert.equal(validateFields({querySelectorAll:()=>[disabled,optional]} as unknown as HTMLElement),true)
})
test('feedback distinguishes real success from pending payments and ignores loading/count labels',()=>{
 assert.equal(noticeKind('Route saved.'),'success');assert.equal(noticeKind('Could not save route.'),'error')
 assert.equal(noticeKind('Your booking is saved and remains unpaid.'),'info');assert.equal(noticeKind('If an account exists, a code was sent.'),'info')
 assert.equal(noticeKind('Loading routes…'),null);assert.equal(noticeKind('100 payments'),null)
})
