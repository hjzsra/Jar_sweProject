// Health check: verifies DB connectivity
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // simple quick query
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Health check DB error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
