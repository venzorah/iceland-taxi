import { createHash, randomUUID } from 'node:crypto'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** Validate bytes as well as the browser-supplied MIME type. SVG/HTML are not accepted. */
export function imageMatchesType(bytes: Uint8Array, mime: string) {
  const b = Buffer.from(bytes)
  if (mime === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (mime === 'image/png') return b.length > 8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (mime === 'image/webp') return b.length > 12 && b.toString('ascii',0,4) === 'RIFF' && b.toString('ascii',8,12) === 'WEBP'
  return false
}
export function uploadSignature(params: Record<string,string>, secret: string) {
  return createHash('sha256').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret).digest('hex')
}
export async function uploadImage(file: File) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET
  if (!cloud || !key || !secret || !/^[a-z0-9_-]+$/i.test(cloud)) return { ok:false as const, status:503, message:'Image uploads are not available yet.' }
  if (!file.size || file.size > MAX_IMAGE_BYTES) return { ok:false as const,status:400,message:'Choose an image up to 5 MB.' }
  if (!imageMatchesType(new Uint8Array(await file.arrayBuffer()),file.type)) return {ok:false as const,status:400,message:'Choose a JPEG, PNG or WebP image.'}
  const params = { public_id:`iceland-taxi/${randomUUID()}`, timestamp:String(Math.floor(Date.now()/1000)), overwrite:'false' }
  const form = new FormData()
  for (const [k,v] of Object.entries(params)) form.set(k,v)
  form.set('signature',uploadSignature(params,secret)); form.set('api_key',key); form.set('file',file)
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`,{method:'POST',body:form,signal:AbortSignal.timeout(30000)})
    const data = await response.json()
    if (!response.ok || typeof data.secure_url !== 'string' || data.resource_type !== 'image' || data.public_id !== params.public_id) return {ok:false as const,status:502,message:'Image upload could not be confirmed. Please try again.'}
    const url = new URL(data.secure_url)
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return {ok:false as const,status:502,message:'Image upload returned an invalid address.'}
    return {ok:true as const,url:url.href,publicId:data.public_id as string}
  } catch { return {ok:false as const,status:502,message:'Image upload could not be confirmed. Please try again.'} }
}
