'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, ChevronRight, FileText, Save, Search } from 'lucide-react'
import { AdminButton, AdminEmpty, AdminForm, adminInput, adminRequest, useAdminConfirm } from '@/components/admin/AdminUI'
import { ImageField, type LibraryImage } from './ImageField'
import { CONTENT_PAGES, pageKeys, sharedContentKey } from '@/lib/content/pages'
import { notify } from '@/lib/forms/feedback'
import { safeHeroHref } from '@/lib/content/hero'

type Block = { key: string; kind: 'image' | 'text' | 'link'; group: string; label: string; value: string }

export function WebsiteContent() {
 const [blocks,setBlocks]=useState<Block[]>([])
 const [saved,setSaved]=useState<Record<string,string>>({})
 const [images,setImages]=useState<LibraryImage[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [saving,setSaving]=useState(false)
 const [selected,setSelected]=useState<string|null>(null)
 const [query,setQuery]=useState('')
 const confirm=useAdminConfirm()
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  try {
   const [content,library]=await Promise.all([
    adminRequest<{blocks:Block[]}>('/api/admin/site-blocks'),
    adminRequest<{images:LibraryImage[]}>('/api/admin/library').catch(()=>({images:[]})),
   ])
   setBlocks(content.blocks)
   setSaved(Object.fromEntries(content.blocks.map(block=>[block.key,block.value])))
   setImages(library.images)
  }catch(e){setError(e instanceof Error?e.message:'Could not load website content.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])
 const page=CONTENT_PAGES.find(item=>item.id===selected)
 const keys=new Set(page?pageKeys(page):[])
 const changed=blocks.filter(block=>keys.has(block.key)&&block.value!==saved[block.key])
 const update=(key:string,value:string)=>setBlocks(current=>current.map(block=>block.key===key?{...block,value}:block))
 const save=async()=>{
  if(!page||!changed.length)return
  setSaving(true)
  try{
   const result=await adminRequest<{updates:{key:string;value:string}[]}>('/api/admin/site-blocks',{
    method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({updates:changed.map(({key,value})=>({key,value}))}),
   })
   const values=Object.fromEntries(result.updates.map(item=>[item.key,item.value]))
   setBlocks(current=>current.map(block=>Object.hasOwn(values,block.key)?{...block,value:values[block.key]}:block))
   setSaved(current=>({...current,...values}))
   window.dispatchEvent(new Event('itb-site-content-updated'))
   notify(`${page.title} saved.`,'success')
  }finally{setSaving(false)}
 }
 const discard=async()=>{
  if(!await confirm({title:'Discard this page’s unsaved changes?',description:'Your last saved page content will be kept.',confirmLabel:'Discard changes'}))return
  setBlocks(current=>current.map(block=>keys.has(block.key)?{...block,value:saved[block.key]}:block))
 }
 const field=(block:Block)=><div key={block.key} className="space-y-1">
  {block.kind==='image'?<div className="text-sm font-semibold text-heading">{block.label}
   <ImageField value={block.value} images={images} onUploaded={image=>setImages(current=>[image,...current.filter(item=>item.id!==image.id)])} onChange={url=>update(block.key,url)}/>
  </div>:<label className="block text-sm font-semibold text-heading">{block.label}
   {block.kind==='link'?<input aria-label={block.label} value={block.value} placeholder="/airport-transfer or https://example.com" className={adminInput} onChange={event=>{const value=event.target.value;event.target.setCustomValidity(value.trim()&&!safeHeroHref(value.trim())?'Enter a site path beginning with / or a secure HTTPS link.':'');update(block.key,value)}}/>:
    <textarea aria-label={block.label} value={block.value} rows={block.key.includes('.body')||block.value.length>120?3:2} onChange={event=>update(block.key,event.target.value)} className={adminInput}/>
   }
  </label>}
  {sharedContentKey(block.key)&&<p className="text-xs leading-relaxed text-muted">Shared with other pages. Saving here updates every place using this {block.kind==='image'?'image':'content'}.</p>}
 </div>
 if(loading)return <div role="status" className="p-6 text-sm text-muted">Loading website pages…</div>
 if(error)return <div className="p-6"><AdminEmpty title="Could not load website content" description={error} action={<AdminButton onClick={load} className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary">Try again</AdminButton>}/></div>
 if(!page){
  const pages=CONTENT_PAGES.filter(item=>`${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
   <header><h2 className="font-display text-xl font-bold text-heading">Website content</h2><p className="mt-2 text-sm text-muted">Choose a page to edit its wording, photos and buttons together. Your existing content is already filled in.</p></header>
   <label className="flex max-w-md items-center gap-2 rounded-xl border border-line bg-input px-3 py-2 text-muted"><Search size={18}/><input type="search" aria-label="Find a website page" placeholder="Find a page…" value={query} onChange={event=>setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none"/></label>
   {!pages.length?<AdminEmpty title="No matching pages" description="Try another page name."/>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pages.map(item=>{
    const pageFields=new Set(pageKeys(item)),pending=blocks.filter(block=>pageFields.has(block.key)&&block.value!==saved[block.key]).length
    return <button key={item.id} type="button" onClick={()=>setSelected(item.id)} className="flex flex-col rounded-2xl border border-line bg-bg p-5 text-left transition-colors hover:border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
     <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-surface text-link"><FileText size={22}/></span>
     <span className="font-display text-lg font-bold text-heading">{item.title}</span><span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{item.description}</span>
     <span className="mt-5 flex w-full items-center justify-between gap-2 text-sm font-semibold text-link">{pending?`${pending} unsaved changes`:'Edit page'}<ChevronRight size={18}/></span>
    </button>
   })}</div>}
  </section>
 }
 return <section className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
  <button type="button" disabled={saving} onClick={()=>setSelected(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-link"><ArrowLeft size={16}/>All website pages</button>
  <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold text-heading">{page.title}</h2><p className="mt-2 text-sm text-muted">{page.description}</p></div>{page.href&&<a href={page.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-heading">View page<ArrowUpRight size={16}/></a>}</header>
  <p className="text-xs leading-relaxed text-muted">Open a section below to edit it. Clear a text field to restore its original wording when saved. Published listings and prices are managed in Services and Routes.</p>
  <AdminForm onSubmit={save} className="space-y-4">
   <fieldset disabled={saving} className="min-w-0 space-y-4">
    {page.sections.map((section,index)=>{
     const fields=section.keys.map(key=>blocks.find(block=>block.key===key)).filter((block):block is Block=>!!block)
     const translations=fields.filter(block=>block.key.endsWith('Is'))
     return <details key={section.title} open={index===0} className="overflow-hidden rounded-2xl border border-line bg-bg">
      <summary className="cursor-pointer px-5 py-4 font-semibold text-heading">{section.title}</summary>
      <div className="space-y-5 border-t border-line p-5">{fields.filter(block=>!block.key.endsWith('Is')).map(field)}
       {!!translations.length&&<details className="rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold text-muted">Icelandic text (optional)</summary><div className="mt-4 space-y-4">{translations.map(field)}</div></details>}
      </div>
     </details>
    })}
   </fieldset>
   <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bg p-4 shadow-lg">
    <p role="status" className="text-sm text-muted">{changed.length?`${changed.length} unsaved ${changed.length===1?'change':'changes'}`:'All changes saved'}</p>
    <div className="flex flex-wrap gap-2"><AdminButton type="button" disabled={saving||!changed.length} onClick={discard} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Discard changes</AdminButton><AdminButton type="submit" disabled={saving||!changed.length} pendingLabel="Saving page…" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary"><Save size={16}/>Save page</AdminButton></div>
   </div>
  </AdminForm>
 </section>
}
