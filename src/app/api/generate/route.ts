import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateNames } from '@/lib/llm';
import { ensureUsageRecord, calcLimits } from '@/lib/usage-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bazi, birthPlace, platform, requirements, lockedWords, fingerprint, lang } = body;

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Missing fingerprint, please refresh the page' }, { status: 400 });
    }

    // Check usage limit
    const record = await ensureUsageRecord(fingerprint);
    const { limit: genLimit } = calcLimits(record.streak, record.shareCount);

    if (record.generateCount >= genLimit) {
      return NextResponse.json({ error: 'Daily free generations exhausted', used: true, limit: genLimit }, { status: 429 });
    }

    // Call LLM to generate name suggestions
    const result = await generateNames({ bazi, birthPlace, platform, requirements, lockedWords, lang });

    // Save and update usage
    await db.evaluation.create({
      data: {
        fingerprint,
        type: 'generate',
        name: lockedWords || 'Generated suggestions',
        birthPlace: birthPlace || null,
        bazi: bazi || null,
        platform: platform || null,
        results: JSON.stringify(result),
      },
    });

    await db.usageLimit.update({
      where: { fingerprint },
      data: { generateCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Generation service error, please try again' },
      { status: 500 }
    );
  }
}
