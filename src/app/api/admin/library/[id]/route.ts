import {Prisma} from '@prisma/client'
import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
import {imageForm,UploadInputError} from '@/lib/media/form'
import {uploadImage} from '@/lib/media/cloudinary'
import {mediaView} from '@/lib/media/library'
type Ctx={params:Promise<{id:string}>}
export const PATCH=apiHandler(async(req:Request,ctx:Ctx)=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const {id}=await ctx.params
 if(id.startsWith('file:'))return jsonError(400,'BUILT_IN_IMAGE','Select a replacement through Website content.')
 const current=await prisma.mediaAsset.findFirst({where:{id,archived:false}})
 if(!current)return jsonError(404,'NOT_FOUND','Image not found.')
 try{
  const {file,alt}=await imageForm(req),uploaded=await uploadImage(file)
  if(!uploaded.ok)return jsonError(uploaded.status,'UPLOAD_UNAVAILABLE',uploaded.message)
  const image=await prisma.$transaction(async tx=>{
   const claimed=await tx.mediaAsset.updateMany({where:{id,archived:false,updatedAt:current.updatedAt},data:{archived:true}})
   if(!claimed.count)return null
   const asset=await tx.mediaAsset.create({data:{name:file.name.slice(0,180)||'Image',mime:file.type,alt:alt||current.alt,url:uploaded.url,publicId:uploaded.publicId,bytes:file.size}})
   await tx.siteBlock.updateMany({where:{value:current.url},data:{value:uploaded.url}})
   await tx.service.updateMany({where:{imageUrl:current.url},data:{imageUrl:uploaded.url}})
   await tx.destination.updateMany({where:{imageUrl:current.url},data:{imageUrl:uploaded.url}})
   await tx.editorialPost.updateMany({where:{imageUrl:current.url},data:{imageUrl:uploaded.url}})
   return mediaView(asset)
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:20000})
  if(!image)return jsonError(409,'IMAGE_CHANGED','This image changed. Refresh the library.')
  return jsonOk({ok:true,image})
 }catch(error){if(error instanceof UploadInputError)return jsonError(error.status,'VALIDATION_ERROR',error.message);if((error as {code?:string}).code==='P2034')return jsonError(409,'IMAGE_CHANGED','This image changed. Refresh the library.');throw error}
})
/** Archiving removes an item from the picker without breaking existing public pages. */
export const DELETE=apiHandler(async(_req:Request,ctx:Ctx)=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const {id}=await ctx.params
 const asset=await prisma.mediaAsset.findUnique({where:{id}})
 if(!asset)return jsonError(404,'NOT_FOUND','Uploaded image not found.')
 await prisma.mediaAsset.update({where:{id},data:{archived:true}})
 return jsonOk({ok:true,archived:true})
})
