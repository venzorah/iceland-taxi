import { apiHandler,jsonError,jsonOk } from '@/lib/api'
import { rejectDriverOnly } from '@/lib/auth/admin-access'
import { MAX_IMAGE_BYTES,uploadImage } from '@/lib/media/cloudinary'
export const POST = apiHandler(async(req:Request)=>{
  const blocked=await rejectDriverOnly('services')
  if(blocked)return blocked
  // Cap the stream before parsing multipart data, regardless of Content-Length.
  const type=req.headers.get('content-type')||''
  if(!type.startsWith('multipart/form-data;'))return jsonError(400,'VALIDATION_ERROR','Choose an image to upload.')
  const reader=req.body?.getReader()
  if(!reader)return jsonError(400,'VALIDATION_ERROR','Choose an image to upload.')
  let size=0;const chunks:Uint8Array[]=[]
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE_BYTES+65536){await reader.cancel();return jsonError(413,'IMAGE_TOO_LARGE','Choose an image up to 5 MB.')}chunks.push(value)}
  } finally {reader.releaseLock()}
  let form:FormData
  try {form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':type}}).formData()}catch{return jsonError(400,'VALIDATION_ERROR','Invalid image upload.')}
  const file=form.get('file')
  if(!(file instanceof File))return jsonError(400,'VALIDATION_ERROR','Choose an image to upload.')
  const uploaded=await uploadImage(file)
  if(!uploaded.ok)return jsonError(uploaded.status,'UPLOAD_UNAVAILABLE',uploaded.message)
  return jsonOk({ok:true,url:uploaded.url,publicId:uploaded.publicId},{status:201})
})
