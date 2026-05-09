import { NextRequest, NextResponse } from 'next/server'
import { evaluateName } from '@/lib/llm'
import { getRateLimit, incrementEvaluateCount, getCachedResult, setCachedResult } from '@/lib/redis-cache'

export async function POST(req: NextRequest) {
  try {
    const { name, birthDate, bazi, birthPlace, platform, fingerprint, lang } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

    const rateLimit = await getRateLimit(fingerprint)
    if (rateLimit.evaluateCount >= 10) {
      return NextResponse.json({ error: 'Limit reached', limit: 10 }, { status: 429 })
    }

    const cacheKey = `eval:${name}|${bazi || ''}|${platform || ''}|${lang || 'zh'}`
    const cached = await getCachedResult(cacheKey)
    if (cached) {
      await incrementEvaluateCount(fingerprint)
      return NextResponse.json({ success: true, data: cached })
    }

    const result = await evaluateName({ name: name.trim(), birthDate, bazi, birthPlace, platform, lang })
    await setCachedResult(cacheKey, result, 24 * 60 * 60)
    await incrementEvaluateCount(fingerprint)

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('Evaluate error:', e)
    const message = e instanceof Error ? e.message : 'Service error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
