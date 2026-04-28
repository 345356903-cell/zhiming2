import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateName } from '@/lib/llm';
import { ensureUsageRecord, calcLimits } from '@/lib/usage-limit';

// In-memory result cache (30 min TTL) for deterministic results
const resultCache = new Map<string, { data: any; expiresAt: number }>();

function getCacheKey(name: string, bazi: string, platform: string, lang: string): string {
  return `${name}|${bazi}|${platform}|${lang}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, birthDate, bazi, birthPlace, platform, fingerprint, lang } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Please enter a name to evaluate' }, { status: 400 });
    }
    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Missing fingerprint, please refresh the page' }, { status: 400 });
    }

    // Check usage limit
    const record = await ensureUsageRecord(fingerprint);
    const { limit: evalLimit } = calcLimits(record.streak, record.shareCount);

    if (record.evaluateCount >= evalLimit) {
      return NextResponse.json({ error: 'Daily free evaluations exhausted', used: true, limit: evalLimit }, { status: 429 });
    }

    // Check result cache (deterministic scores are cacheable)
    const cacheKey = getCacheKey(name.trim(), bazi || '', platform || '', lang || 'zh');
    const cached = resultCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      await db.usageLimit.update({
        where: { fingerprint },
        data: { evaluateCount: { increment: 1 }, lastUsedAt: new Date() },
      });
      return NextResponse.json({ success: true, data: cached.data });
    }

    // Call LLM to evaluate the name
    const result = await evaluateName({ name: name.trim(), birthDate, bazi, birthPlace, platform, lang });

    // Cache result for 30 minutes
    resultCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30 * 60 * 1000 });

    // Clean expired cache entries periodically
    if (resultCache.size > 1000) {
      const now = Date.now();
      for (const [key, val] of resultCache) {
        if (val.expiresAt <= now) resultCache.delete(key);
      }
    }

    // Save evaluation and update usage
    await db.evaluation.create({
      data: {
        fingerprint,
        type: 'evaluate',
        name: name.trim(),
        birthDate: birthDate || null,
        birthPlace: birthPlace || null,
        bazi: bazi || null,
        platform: platform || null,
        results: JSON.stringify(result),
      },
    });

    await db.usageLimit.update({
      where: { fingerprint },
      data: { evaluateCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Evaluate API error:', error);
    return NextResponse.json(
      { error: 'Evaluation service error, please try again' },
      { status: 500 }
    );
  }
}
