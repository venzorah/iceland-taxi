import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function GET(req: Request) {
  const url = new URL(req.url)
  const supabase = await createSupabaseServerClient()
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const code = url.searchParams.get('code')
  const result = code ? await supabase.auth.exchangeCodeForSession(code)
    : token_hash && type ? await supabase.auth.verifyOtp({ token_hash, type }) : null
  const target = result && !result.error ? (type === 'recovery' ? '/login?mode=update' : '/login?complete=1') : '/login?error=confirmation'
  return NextResponse.redirect(new URL(target, url.origin))
}
