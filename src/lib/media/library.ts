import fs from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { uploadImage } from './cloudinary'
export const mediaView=(a:{id:string;name:string;url:string;alt:string;mime:string})=>({id:a.id,name:a.name,url:a.url,alt:a.alt,mime:a.mime,source:'upload' as const})
export async function builtInImages(){
 const items:{id:string;name:string;url:string;alt:string;source:'built-in'}[]=[]
 for(const folder of ['photos','brand','icons']){
  let files:string[];try{files=await fs.readdir(path.join(process.cwd(),'public',folder))}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error}
  for(const name of files)if(/\.(png|jpe?g|webp|gif|svg|ico)$/i.test(name))items.push({id:`file:${folder}/${name}`,name,url:`/${folder}/${name}`,alt:'',source:'built-in'})
 }
 return items.sort((a,b)=>a.url.localeCompare(b.url))
}
export async function addImage(file:File,alt=''){
 const result=await uploadImage(file)
 if(!result.ok)return result
 const asset=await prisma.mediaAsset.create({data:{name:file.name.slice(0,180)||'Image',mime:file.type,bytes:file.size,alt,url:result.url,publicId:result.publicId}})
 return {ok:true as const,image:mediaView(asset)}
}
