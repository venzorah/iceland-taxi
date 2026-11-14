'use client'
import {useEffect,useState} from 'react'
import {whatsappHref} from '@/lib/whatsapp'
type Contacts={email?:string|null;phone?:string|null;whatsappE164?:string|null}
/** Driver recruitment stays with operations; these links open the company's actual contact channels. */
export function DriverSupport(){
 const [contacts,setContacts]=useState<Contacts|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{const controller=new AbortController();setError(false);fetch('/api/company',{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok||!data.ok)throw new Error('Contact unavailable');if(!controller.signal.aborted)setContacts(data.company||{})}).catch(()=>{if(!controller.signal.aborted)setError(true)});return()=>controller.abort()},[retry])
 const available=!!(contacts?.email||contacts?.phone||contacts?.whatsappE164)
 return <section id="join-driver-team" className="mt-6 scroll-mt-6 border-t border-line pt-4"><h2 className="text-sm font-semibold">Join our driving team</h2><p className="mt-1 text-sm text-muted">Speak to operations about joining. Once approved, use your registered email to activate your driver account.</p>
  {error?<p role="alert" className="mt-3 text-sm text-error">Contact details could not be loaded. <button type="button" onClick={()=>setRetry(v=>v+1)} className="underline">Try again</button></p>:!contacts?<p className="mt-3 text-sm text-muted">Loading contact options…</p>:available?<div className="mt-3 flex flex-wrap gap-3">
   {contacts.whatsappE164&&<a href={whatsappHref({e164:contacts.whatsappE164,text:'Hello, I would like to ask about joining Iceland Taxi Booking as a driver.'})} target="_blank" rel="noreferrer" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Contact operations</a>}
   {contacts.email&&<a href={`mailto:${contacts.email}?subject=Driver%20enquiry`} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-heading">Email the team</a>}
   {contacts.phone&&<a href={`tel:${contacts.phone.replace(/[^+\d]/g,'')}`} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-heading">Call operations</a>}
  </div>:<p className="mt-3 text-sm text-muted">Driver contact details will appear here once published by the company.</p>}
 </section>
}
