import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateName } from '@/lib/llm'
import { ensureUsage, calcLimits } from '@/lib/usage-limit'

// In-memory cache for deterministic results (30 min)
const cache = new Map<string, { data: any; exp: number }>()

export async function POST(req: NextRequest) {
  try {
    const { name, birthDate, bazi, birthPlace, platform, fingerprint, lang } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

    // Usage check
    const r = await ensureUsage(fingerprint)
    const { limit } = calcLimits(r.streak, r.shareCount)
    if (r.evaluateCount >= limit) return NextResponse.json({ error: 'Limit reached', limit }, { status: 429 })

    // Cache check
    const key = `${name}|${bazi || ''}|${platform || ''}|${lang || 'zh'}`
    const hit = cache.get(key)
    if (hit && hit.exp > Date.now()) {
      await db.usageLimit.update({ where: { fingerprint }, data: { evaluateCount: { increment: 1 } } })
      return NextResponse.json({ success: true, data: hit.data })
    }

    // Evaluate
    const result = await evaluateName({ name: name.trim(), birthDate, bazi, birthPlace, platform, lang })

    // Cache
    cache.set(key, { data: result, exp: Date.now() + 30 * 60 * 1000 })
    if (cache.size > 500) { const now = Date.now(); for (const [k, v] of cache) { if (v.exp <= now) cache.delete(k) } }

    // Save & update
    await db.evaluation.create({ data: { fingerprint, type: 'evaluate', name: name.trim(), birthDate: birthDate || null, birthPlace: birthPlace || null, bazi: bazi || null, platform: platform || null, results: JSON.stringify(result) } })
    await db.usageLimit.update({ where: { fingerprint }, data: { evaluateCount: { increment: 1 }, lastUsedAt: new Date() } })

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('Evaluate error:', e)
    return NextResponse.json({ error: 'Service error' }, { status: 500 })
  }
}
