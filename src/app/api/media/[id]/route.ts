import {apiHandler,jsonError,prisma} from '@/lib/api'
type Ctx={params:Promise<{id:string}>}
export const GET=apiHandler(async(_req:Request,ctx:Ctx)=>{
 const {id}=await ctx.params
 const asset=await prisma.mediaAsset.findUnique({where:{id},select:{url:true}})
 if(!asset)return jsonError(404,'NOT_FOUND','Image not found.')
 return new Response(null,{status:302,headers:{Location:asset.url,'Cache-Control':'no-store'}})
})
