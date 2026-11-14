'use client'
import { useEffect, useRef, useState } from 'react'
export function ImageUpload({onUploaded}:{onUploaded:(url:string)=>void}) {
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  return <div><label className="block text-xs font-semibold text-muted">Upload image (JPEG, PNG or WebP, up to 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="mt-2 block max-w-full text-sm" onChange={async e=>{
    const file=e.currentTarget.files?.[0];e.currentTarget.value=''
    if(!file)return
    if(file.size>5*1024*1024){setMessage('Choose an image up to 5 MB.');return}
    const controller = new AbortController(); request.current = controller
    setBusy(true);setMessage('Uploading…')
    try{const form=new FormData();form.set('file',file);const response=await fetch('/api/admin/uploads',{method:'POST',body:form,signal:controller.signal}),data=await response.json();if(!response.ok||!data.ok)throw new Error(data.message||'Upload failed.');if(controller.signal.aborted)return;onUploaded(data.url);setMessage('Uploaded. Save this item to publish the image.')}
    catch(error){if(controller.signal.aborted)return;setMessage(error instanceof Error?error.message:'Upload failed.')}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }}/></label>{message&&<p role="status" className="mt-2 text-xs text-muted">{message}</p>}</div>
}
