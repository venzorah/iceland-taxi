import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import * as jsx from 'react/jsx-runtime'
type Node = { type?: unknown; props?: Record<string, unknown> }
function fixture(failSignup=false, failResend=false) {
 const state: unknown[]=[];let index=0,resends=0
 const imports:Record<string,unknown>={
  react:{useState:(initial:unknown)=>{const slot=index++;if(!(slot in state))state[slot]=initial;return[state[slot],(value:unknown)=>{state[slot]=typeof value==='function'?value(state[slot]):value}]},useRef:()=>({current:null}),useEffect:()=>{}},
  'react/jsx-runtime':jsx,'next/navigation':{useSearchParams:()=>new URLSearchParams()},'next/link':{__esModule:true,default:'a'},'next/image':{__esModule:true,default:'img'},'lucide-react':{},
  '@/lib/auth/login-destination':{},'@/lib/auth/client':{authClient:{signUp:{email:async()=>failSignup?{error:{message:'Fixture signup rejected'}}:{data:{token:null},error:null}},sendVerificationEmail:async()=>{resends++;return failResend?{error:{message:'Private fixture error'}}:{error:null}}}},
  '@/lib/auth/sign-out':{},'@/components/providers/SessionProvider':{useSiteSession:()=>({user:null})},'@/lib/auth/portal-navigation':{portalNavigation:()=>({kind:'guest'})},
 }
 const source=ts.transpileModule(readFileSync('src/app/login/LoginForm.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const exports:Record<string,unknown>={};vm.runInNewContext(source,{exports,require:(name:string)=>{assert(name in imports,`Unexpected dependency ${name}`);return imports[name]},URLSearchParams,setTimeout,clearTimeout})
 const render=()=>{index=0;return (exports.LoginForm as (p:unknown)=>Node)({portal:'customer',initialMode:'register'})}
 const walk=(node:unknown):Node[]=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node as Node,...walk((node as Node).props?.children)]:[]
 const nodes=()=>walk(render())
 const text=(node:unknown):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text((node as Node).props?.children):''
 const button=(label:string)=>nodes().find(n=>n.type==='button'&&text(n)===label)!
 const submit=async()=>{for(const [placeholder,value] of [['Enter your full name','Fixture Customer'],['you@example.com','fixture@example.test'],['Create a password','Fixture-password-123']]){const input=nodes().find(n=>n.type==='input'&&n.props?.placeholder===placeholder)!;(input.props!.onChange as (e:unknown)=>void)({target:{value}})}const form=nodes().find(n=>n.type==='form')!;await(form.props!.onSubmit as (e:unknown)=>Promise<void>)({preventDefault(){}})}
 return{nodes,text,button,submit,get resends(){return resends}}
}
test('successful unverified customer signup replaces the form with a check-email screen',async()=>{
 const f=fixture();await f.submit();assert.equal(f.nodes().some(n=>n.type==='form'),false);assert(f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Check your email'));assert(f.nodes().some(n=>n.type==='strong'&&f.text(n)==='fixture@example.test'));assert(f.nodes().some(n=>n.type==='a'&&n.props?.href==='/login'&&f.text(n)==='Go to sign in'))
 assert(f.button('Resend confirmation email'));await(f.button('Resend confirmation email').props!.onClick as ()=>Promise<void>)();assert.equal(f.resends,1);assert.equal(f.button('Resend available shortly').props!.disabled,true)
 ;(f.button('Use a different email').props!.onClick as ()=>void)();assert(f.nodes().some(n=>n.type==='form'));assert.equal(f.nodes().find(n=>n.props?.placeholder==='you@example.com')?.props?.value,'')
})
test('signup failure stays on the editable form and does not show verification success',async()=>{
 const f=fixture(true);await f.submit();assert(f.nodes().some(n=>n.type==='form'));assert(!f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Check your email'))
})
test('resend failure remains on verification screen with safe retry feedback',async()=>{
 const f=fixture(false,true);await f.submit();await(f.button('Resend confirmation email').props!.onClick as ()=>Promise<void>)();assert(f.nodes().some(n=>n.props?.role==='status'&&f.text(n).includes('Could not request another confirmation email')));assert(f.button('Resend confirmation email'));assert.equal(f.nodes().some(n=>n.type==='form'),false)
})
