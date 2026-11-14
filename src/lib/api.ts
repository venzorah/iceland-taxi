import { NextResponse } from 'next/server'
import { HttpError, validateRequestOrigin, boundedRequest } from '@/lib/security/http'
import { publicRequestBudget } from '@/lib/security/rate-limit'
import { prisma } from '@/lib/prisma'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function withDb<T, F>(fn: () => Promise<T>, _fallback: () => F): Promise<T | F> {
  if (!process.env.DATABASE_URL) throw new ServiceUnavailableError()
  return fn()
}

export { prisma }

export class ServiceUnavailableError extends Error {
  constructor(public code = 'DATABASE_UNAVAILABLE') { super('The service is temporarily unavailable.') }
}

export function isDatabaseUnavailable(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const value = error as { code?: string; name?: string; meta?: { code?: string; error?: string } }
  return ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(value.code || '') || value.name === 'PrismaClientInitializationError' || (value.code === 'P2010' && value.meta?.code === '57014') || (value.code === 'P2028' && /expired|timeout|timed out|unable to start/i.test(value.meta?.error || ''))
}

/** Fail closed with a retryable JSON response; never expose database credentials or queries. */
export function apiHandler<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      if(args[0] instanceof Request){
        validateRequestOrigin(args[0])
        args[0]=await boundedRequest(args[0]) as Args[0]
        await publicRequestBudget(args[0] as Request)
      }
      const response=await handler(...args)
      if(!response.headers.has('Cache-Control'))response.headers.set('Cache-Control','private, no-store')
      return response
    }
    catch (error) {
      if(error instanceof HttpError)return NextResponse.json({ok:false,code:error.code,message:error.message},{status:error.status,headers:{'Cache-Control':'no-store',...(error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}})
      if (error instanceof ServiceUnavailableError || isDatabaseUnavailable(error)) {
        const code = error instanceof ServiceUnavailableError ? error.code : 'DATABASE_UNAVAILABLE'
        console.warn('[api] Service unavailable:', code)
        return NextResponse.json({ ok: false, code, message: 'Temporarily unable to load or save data. Please try again shortly.' }, { status: 503, headers: { 'Retry-After': '30', 'Cache-Control': 'no-store' } })
      }
      console.error('[api] Request failed', { code: (error as {code?:string})?.code || 'INTERNAL_ERROR' })
      return jsonError(500, 'INTERNAL_ERROR', 'The request could not be completed. Please try again.')
    }
  }
}
