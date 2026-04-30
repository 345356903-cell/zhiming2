import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureUsage, calcLimits, secondsUntilReset } from '@/lib/usage-limit'

export async function GET(req: NextRequest) {
  const fingerprint = new URL(req.url).searchParams.get('fingerprint')
  if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

  try {
    const r = await ensureUsage(fingerprint)
    const { limit, streakBonus, shareBonus } = calcLimits(r.streak, r.shareCount)
    return NextResponse.json({
      evaluateCount: r.evaluateCount,
      generateCount: r.generateCount,
      shareCount: r.shareCount,
      streak: r.streak,
      streakBonus,
      evalLimit: limit,
      genLimit: limit,
      evaluateUsed: r.evaluateCount >= limit,
      generateUsed: r.generateCount >= limit,
      secondsUntilReset: secondsUntilReset(),
    })
  } catch (e) {
    console.error('Usage GET error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fingerprint } = await req.json()
    if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

    const r = await ensureUsage(fingerprint)
    const newShareCount = r.shareCount + 1
    const updated = await db.usageLimit.update({
      where: { fingerprint },
      data: { shareCount: newShareCount },
    })

    const { limit } = calcLimits(updated.streak, newShareCount)
    return NextResponse.json({
      success: true,
      shareCount: newShareCount,
      evalLimit: limit,
      genLimit: limit,
      evaluateCount: updated.evaluateCount,
      generateCount: updated.generateCount,
      evaluateUsed: updated.evaluateCount >= limit,
      generateUsed: updated.generateCount >= limit,
    })
  } catch (e) {
    console.error('Usage POST error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
