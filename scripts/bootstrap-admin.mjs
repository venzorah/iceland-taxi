// Explicit operator action only; existing users are migrated with import-accounts.ts instead.
import nextEnv from '@next/env'
import {PrismaClient} from '@prisma/client'
nextEnv.loadEnvConfig(process.cwd())
const email=process.argv[2]?.trim().toLowerCase()
if(!email||!email.includes('@'))throw new Error('Usage: node scripts/bootstrap-admin.mjs EMAIL')
const prisma=new PrismaClient()
try{
 const identity=await prisma.authIdentity.findUnique({where:{email}})
 if(!identity?.emailVerified||identity.disabled)throw new Error('An active verified identity is required; migrate or verify the account first')
 await prisma.$transaction(async tx=>{
  const user=await tx.user.upsert({where:{email},create:{email,name:identity.name,role:'SUPER_ADMIN',staffProfile:{create:{title:'Super Admin',active:true}}},update:{role:'SUPER_ADMIN',staffProfile:{upsert:{create:{title:'Super Admin',active:true},update:{active:true}}}}})
  if(identity.appUserId&&identity.appUserId!==user.id)throw new Error('Identity mapping does not match')
  await tx.authIdentity.update({where:{id:identity.id},data:{appUserId:user.id}})
 })
 console.log('Verified identity linked to the super admin role. No password was changed.')
}finally{await prisma.$disconnect()}
