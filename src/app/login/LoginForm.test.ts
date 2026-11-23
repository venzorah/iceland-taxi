import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import * as jsx from 'react/jsx-runtime'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createAuthentication } from '@/lib/auth/config'
type Node = { type?: unknown; props?: Record<string, unknown> }
function fixture(failSignup=false, failResend=false, portal: 'customer' | 'driver' | 'admin' = 'customer', initialMode = 'register') {
 const state: unknown[]=[];let index=0,resends=0
 const imports:Record<string,unknown>={
  '@/components/feedback/FormFeedback':{useNoticeToast:()=>{}},
  react:{useState:(initial:unknown)=>{const slot=index++;if(!(slot in state))state[slot]=initial;return[state[slot],(value:unknown)=>{state[slot]=typeof value==='function'?value(state[slot]):value}]},useRef:()=>({current:null}),useEffect:()=>{}},
  'react/jsx-runtime':jsx,'next/navigation':{useSearchParams:()=>new URLSearchParams()},'next/link':{__esModule:true,default:'a'},'next/image':{__esModule:true,default:'img'},'lucide-react':{},
  '@/lib/auth/login-destination':{},'@/lib/auth/client':{authClient:{signUp:{email:async()=>failSignup?{error:{message:'Fixture signup rejected'}}:{data:{token:null},error:null}},emailOtp:{sendVerificationOtp:async()=>{resends++;return failResend?{error:{message:'Private fixture error'}}:{error:null}},verifyEmail:async({otp}:{otp:string})=>otp==='123456'?{data:{token:null},error:null}:{error:{code:'INVALID_OTP'}}}}},
  '@/lib/auth/sign-out':{},'@/components/providers/SessionProvider':{useSiteSession:()=>({user:null})},'@/lib/auth/portal-navigation':{portalNavigation:()=>({kind:'guest'})},
 }
 const source=ts.transpileModule(readFileSync('src/app/login/LoginForm.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const exports:Record<string,unknown>={};vm.runInNewContext(source,{exports,require:(name:string)=>{assert(name in imports,`Unexpected dependency ${name}`);return imports[name]},URLSearchParams,setTimeout,clearTimeout})
 const render=()=>{index=0;return (exports.LoginForm as (p:unknown)=>Node)({portal,initialMode})}
 const walk=(node:unknown):Node[]=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node as Node,...walk((node as Node).props?.children)]:[]
 const nodes=()=>walk(render())
 const text=(node:unknown):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text((node as Node).props?.children):''
 const button=(label:string)=>nodes().find(n=>n.type==='button'&&text(n)===label)!
 const submit=async()=>{for(const [placeholder,value] of [['Enter your full name','Fixture Customer'],['you@example.com','fixture@example.test'],['Create a password','Fixture-password-123']]){const input=nodes().find(n=>n.type==='input'&&n.props?.placeholder===placeholder)!;(input.props!.onChange as (e:unknown)=>void)({target:{value}})}const form=nodes().find(n=>n.type==='form')!;await(form.props!.onSubmit as (e:unknown)=>Promise<void>)({preventDefault(){}})}
 return{nodes,text,button,submit,get resends(){return resends}}
}
test('successful unverified signup replaces registration with the check-email OTP screen',async()=>{
 const f=fixture();await f.submit();assert(f.nodes().some(n=>n.props?.id==='auth-code'));assert(!f.nodes().some(n=>n.type==='input'&&n.props?.type==='password'));assert(f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Check your email'));assert(f.nodes().some(n=>n.type==='strong'&&f.text(n)==='fixture@example.test'));assert(f.nodes().some(n=>n.type==='a'&&n.props?.href==='/login'&&f.text(n)==='Go to sign in'))
 assert(f.button('Resend confirmation code'));await(f.button('Resend confirmation code').props!.onClick as ()=>Promise<void>)();assert.equal(f.resends,1);assert.equal(f.button('Resend available shortly').props!.disabled,true)
 ;(f.button('Use a different email').props!.onClick as ()=>void)();assert(f.nodes().some(n=>n.type==='form'));assert.equal(f.nodes().find(n=>n.props?.placeholder==='you@example.com')?.props?.value,'')
})
test('signup failure stays on the editable form and does not show verification success',async()=>{
 const f=fixture(true);await f.submit();assert(f.nodes().some(n=>n.type==='form'));assert(!f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Check your email'))
})
test('resend failure remains on verification screen with safe retry feedback',async()=>{
 const f=fixture(false,true);await f.submit();await(f.button('Resend confirmation code').props!.onClick as ()=>Promise<void>)();assert(f.nodes().some(n=>n.props?.role==='status'&&f.text(n).includes('Private fixture error')));assert(f.button('Resend confirmation code'));assert(f.nodes().some(n=>n.props?.id==='auth-code'))
})

test('OTP input verifies through the incoming client API and incorrect codes remain on the confirmation screen', async () => {
 const f=fixture();await f.submit()
 const setCode=(value:string)=>(f.nodes().find(n=>n.props?.id==='auth-code')!.props!.onChange as (e:unknown)=>void)({target:{value}})
 const submit=async()=>{const form=f.nodes().find(n=>n.type==='form')!;await(form.props!.onSubmit as (e:unknown)=>Promise<void>)({preventDefault(){}})}
 setCode('000000');await submit();assert(f.nodes().some(n=>n.props?.role==='status'&&f.text(n).includes('incorrect or has expired')))
 setCode('123456');await submit();assert(f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Welcome back'));assert(!f.nodes().some(n=>n.props?.id==='auth-code'))
})
test('actual Better Auth issues one hashed signup OTP, rejects wrong/replayed codes, and resets passwords using OTP', async () => {
 const memory={AuthIdentity:[],AuthAccount:[],AuthSession:[],AuthVerification:[],AuthRateLimit:[]} as Record<string,Record<string,unknown>[]>
 const codes:{email:string;code:string;purpose:string}[]=[],links:string[]=[]
 const auth=createAuthentication({database:memoryAdapter(memory),baseURL:'https://fixture.example',secret:'fixture-only-secret-at-least-32-characters',isDisabled:async()=>false,sendLink:async(_email,_subject,url)=>{links.push(url)},sendCode:async(email,_subject,code,purpose)=>{codes.push({email,code,purpose})}})
 const request=(path:string,body:unknown)=>auth.handler(new Request('https://fixture.example/api/auth'+path,{method:'POST',headers:{origin:'https://fixture.example','content-type':'application/json'},body:JSON.stringify(body)}))
 const email='otp-fixture@example.test',password='Fixture-password-123'
 assert.equal((await request('/sign-up/email',{email,name:'Fixture',password})).status,200)
 assert.equal(codes.length,1,JSON.stringify({codeDeliveries:codes.length,linkDeliveries:links.length,identities:memory.AuthIdentity.length}));assert.equal(links.length,0);assert.equal(codes[0].purpose,'email-verification');assert.match(codes[0].code,/^\d{6}$/)
 assert(memory.AuthVerification.every(row=>!String(row.value).includes(codes[0].code)))
 assert.equal((await request('/sign-in/email',{email,password})).status,403)
 assert.equal((await request('/email-otp/verify-email',{email,otp:codes[0].code==='000000'?'111111':'000000'})).status,400)
 assert.equal(memory.AuthIdentity[0].emailVerified,false)
 assert.equal((await request('/email-otp/verify-email',{email,otp:codes[0].code})).status,200)
 assert.equal(memory.AuthIdentity[0].emailVerified,true)
 assert.equal((await request('/email-otp/verify-email',{email,otp:codes[0].code})).status,400)
 assert.equal((await request('/sign-in/email',{email,password})).status,200)
 assert.equal((await request('/email-otp/request-password-reset',{email})).status,200)
 const reset=codes.findLast(row=>row.purpose==='forget-password')!;assert(reset);assert.equal(links.length,0)
 assert.equal((await request('/email-otp/reset-password',{email,otp:reset.code,password:'Replacement-password-123'})).status,200)
 assert.equal((await request('/email-otp/reset-password',{email,otp:reset.code,password:'Another-password-123'})).status,400)
 assert.equal((await request('/sign-in/email',{email,password})).status,401)
 assert.equal((await request('/sign-in/email',{email,password:'Replacement-password-123'})).status,200)
 const expiringEmail='expiry-fixture@example.test'
 assert.equal((await request('/sign-up/email',{email:expiringEmail,name:'Fixture',password})).status,200)
 const beforeResend=codes.length
 assert.equal((await request('/email-otp/send-verification-otp',{email:expiringEmail,type:'email-verification'})).status,200)
 assert.equal(codes.length,beforeResend+1)
 for(const row of memory.AuthVerification) row.expiresAt=new Date(Date.now()-1000)
 const lastCode=codes.findLast(row=>row.email===expiringEmail)!
 assert.equal((await request('/email-otp/verify-email',{email:expiringEmail,otp:lastCode.code})).status,400)
 assert.equal(memory.AuthIdentity.find(row=>row.email===expiringEmail)?.emailVerified,false)
})

test('the verification sign-in action changes mode even when already on the login route', async () => {
 const f=fixture();await f.submit()
 const link=f.nodes().find(n=>n.type==='a'&&f.text(n)==='Go to sign in')!
 ;(link.props!.onClick as ()=>void)()
 assert(f.nodes().some(n=>n.type==='h1'&&f.text(n)==='Welcome back'))
 assert(!f.nodes().some(n=>n.props?.id==='auth-code'))
})

test('portal constraints survive the merge: customer/driver recovery, no driver signup, no admin recovery action', () => {
 for (const portal of ['customer','driver','admin'] as const) {
   const f=fixture(false,false,portal,'login')
   assert.equal(!!f.button('Forgot password?'),portal!=='admin')
   assert.equal(f.nodes().some(n=>n.type==='a'&&n.props?.href==='/signup'),portal==='customer')
 }
 const driver=fixture(false,false,'driver','register')
 assert(!driver.nodes().some(n=>n.props?.autoComplete==='name'))
 const admin=fixture(false,false,'admin','reset')
 assert(admin.nodes().some(n=>n.type==='h1'&&admin.text(n)==='Welcome back'))
})
