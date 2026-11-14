import { MAX_IMAGE_BYTES } from './cloudinary'
export class UploadInputError extends Error { constructor(message:string,public status=400){super(message)} }
/** Enforce the size limit before multipart parsing, including requests without Content-Length. */
export async function imageForm(req:Request){
  const type=req.headers.get('content-type')||''
  if(!type.startsWith('multipart/form-data;'))throw new UploadInputError('Choose an image file.')
  const reader=req.body?.getReader();if(!reader)throw new UploadInputError('Choose an image file.')
  let size=0;const chunks:Uint8Array[]=[]
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE_BYTES+65536){await reader.cancel();throw new UploadInputError('Choose an image up to 5 MB.',413)}chunks.push(value)}}finally{reader.releaseLock()}
  let form:FormData
  try{form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':type}}).formData()}catch{throw new UploadInputError('Invalid image upload.')}
  const file=form.get('file');if(!(file instanceof File))throw new UploadInputError('Choose an image file.')
  if(!file.size||file.size>MAX_IMAGE_BYTES)throw new UploadInputError('Choose an image up to 5 MB.')
  const alt=String(form.get('alt')||'').trim().slice(0,500)
  return {file,alt}
}
