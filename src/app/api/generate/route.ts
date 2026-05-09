import { NextRequest, NextResponse } from 'next/server'
import { generateNames } from '@/lib/llm'
import { getRateLimit, incrementGenerateCount, getCachedResult, setCachedResult } from '@/lib/redis-cache'

export async function POST(req: NextRequest) {
  try {
    const { bazi, birthPlace, platform, requirements, lockedWords, nameLength, fingerprint, lang } = await req.json()
    if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

    const rateLimit = await getRateLimit(fingerprint)
    if (rateLimit.generateCount >= 10) {
      return NextResponse.json({ error: 'Limit reached', limit: 10 }, { status: 429 })
    }

    const cacheKey = `gen:${bazi || ''}|${birthPlace || ''}|${nameLength || 2}|${lang || 'zh'}`
    const cached = await getCachedResult(cacheKey)
    if (cached) {
      await incrementGenerateCount(fingerprint)
      return NextResponse.json({ success: true, data: cached })
    }

    const result = await generateNames({ bazi, birthPlace, platform, requirements, lockedWords, nameLength, lang })
    await setCachedResult(cacheKey, result, 24 * 60 * 60)
    await incrementGenerateCount(fingerprint)

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('Generate error:', e)
    const message = e instanceof Error ? e.message : 'Service error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
