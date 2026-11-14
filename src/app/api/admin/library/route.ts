import {apiHandler,jsonError,jsonOk,prisma} from '@/lib/api'
import {rejectDriverOnly} from '@/lib/auth/admin-access'
import {addImage,builtInImages,mediaView} from '@/lib/media/library'
import {imageForm,UploadInputError} from '@/lib/media/form'
export const GET=apiHandler(async()=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 const [uploads,builtIn]=await Promise.all([prisma.mediaAsset.findMany({where:{archived:false},orderBy:{createdAt:'desc'}}),builtInImages()])
 return jsonOk({ok:true,images:[...uploads.map(mediaView),...builtIn]},{headers:{'Cache-Control':'private, no-store'}})
})
export const POST=apiHandler(async(req:Request)=>{
 const blocked=await rejectDriverOnly('editorial');if(blocked)return blocked
 try{const {file,alt}=await imageForm(req);const result=await addImage(file,alt);return result.ok?jsonOk({ok:true,image:result.image},{status:201}):jsonError(result.status,'UPLOAD_UNAVAILABLE',result.message)}
 catch(error){if(error instanceof UploadInputError)return jsonError(error.status,'VALIDATION_ERROR',error.message);throw error}
})
