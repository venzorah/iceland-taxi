import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status })
}

export async function withDb<T, F>(fn: () => Promise<T>, fallback: () => F): Promise<T | F> {
  if (!process.env.DATABASE_URL) {
    return fallback()
  }
  try {
    return await fn()
  } catch (error) {
    console.error(error)
    return fallback()
  }
}

export { prisma }
