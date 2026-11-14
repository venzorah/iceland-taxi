import {POST as upload} from '@/app/api/admin/library/route'
/** Compatibility for existing service/destination upload controls; the library persists every upload. */
export async function POST(req:Request){
 const response=await upload(req)
 if(!response.ok)return response
 const data=await response.json()
 return Response.json({...data,url:data.image.url},{status:201})
}
