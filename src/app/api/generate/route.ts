import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNames } from '@/lib/llm'
import { ensureUsage, calcLimits } from '@/lib/usage-limit'

export async function POST(req: NextRequest) {
  try {
    const { bazi, birthPlace, platform, requirements, lockedWords, fingerprint, lang } = await req.json()
    if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

    const r = await ensureUsage(fingerprint)
    const { limit } = calcLimits(r.streak, r.shareCount)
    if (r.generateCount >= limit) return NextResponse.json({ error: 'Limit reached', limit }, { status: 429 })

    const result = await generateNames({ bazi, birthPlace, platform, requirements, lockedWords, lang })

    await db.evaluation.create({ data: { fingerprint, type: 'generate', name: lockedWords || 'Generated', birthPlace: birthPlace || null, bazi: bazi || null, platform: platform || null, results: JSON.stringify(result) } })
    await db.usageLimit.update({ where: { fingerprint }, data: { generateCount: { increment: 1 }, lastUsedAt: new Date() } })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('Generate error:', e)
    return NextResponse.json({ error: 'Service error' }, { status: 500 })
  }
}
