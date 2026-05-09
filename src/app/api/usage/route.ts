import { NextRequest, NextResponse } from 'next/server'
import { getRateLimit, secondsUntilReset } from '@/lib/redis-cache'

export async function GET(req: NextRequest) {
  const fingerprint = new URL(req.url).searchParams.get('fingerprint')
  if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

  try {
    const rateLimit = await getRateLimit(fingerprint)
    return NextResponse.json({
      evaluateCount: rateLimit.evaluateCount,
      generateCount: rateLimit.generateCount,
      evaluateLimit: 10,
      generateLimit: 10,
      evaluateUsed: rateLimit.evaluateCount >= 10,
      generateUsed: rateLimit.generateCount >= 10,
      secondsUntilReset: secondsUntilReset(),
    })
  } catch (e) {
    console.error('Usage GET error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
