import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
nextEnv.loadEnvConfig(process.cwd())
const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes('@')) throw new Error('Usage: node scripts/bootstrap-admin.mjs EMAIL')
const prisma = new PrismaClient()
try {
  const identities = await prisma.$queryRaw`SELECT id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`
  let authId = identities[0]?.id
  if (!authId && process.env.SUPABASE_SECRET_KEY) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    // No password from chat is used, stored, or printed. Set a private password using recovery.
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, password: randomBytes(48).toString('base64url') })
    if (error) throw new Error('Supabase could not create the admin identity. Check the server secret key and Auth configuration.')
    authId = data.user.id
  }
  await prisma.user.upsert({ where: { email },
    create: { email, name: 'Super Admin', role: 'SUPER_ADMIN', authId: authId || null, staffProfile: { create: { title: 'Super Admin', active: true } } },
    update: { role: 'SUPER_ADMIN', ...(authId ? { authId } : {}), staffProfile: { upsert: { create: { title: 'Super Admin', active: true }, update: { active: true } } } },
  })
  console.log(authId ? 'Super admin identity linked. Use Forgot password on /login to set a private password.' : 'Super admin role reserved. Create the matching confirmed user in Supabase Authentication, or add SUPABASE_SECRET_KEY and rerun this command.')
} finally { await prisma.$disconnect() }
