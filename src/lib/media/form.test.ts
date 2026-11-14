import test from 'node:test'
import assert from 'node:assert/strict'
import {imageForm,UploadInputError} from './form'
import {MAX_IMAGE_BYTES} from './cloudinary'
test('multipart image parsing retains a file and bounded description',async()=>{
 const form=new FormData();form.set('file',new File(['image'],'test.png',{type:'image/png'}));form.set('alt','  Description  ')
 const result=await imageForm(new Request('http://localhost/upload',{method:'POST',body:form}))
 assert.equal(result.file.name,'test.png');assert.equal(result.alt,'Description')
})
test('upload parser rejects invalid content and caps the stream before multipart parsing',async()=>{
 await assert.rejects(()=>imageForm(new Request('http://localhost/upload',{method:'POST',body:'bad'})),UploadInputError)
 const request=new Request('http://localhost/upload',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test'},body:new Uint8Array(MAX_IMAGE_BYTES+65537)})
 await assert.rejects(()=>imageForm(request),(e:unknown)=>e instanceof UploadInputError&&e.status===413)
})
