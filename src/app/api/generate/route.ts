import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateNames } from '@/lib/llm';

const MAX_FREE_GENERATIONS = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bazi, birthPlace, platform, requirements, lockedWords, fingerprint } = body;

    // Validate required fields
    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { error: '缺少用户标识，请刷新页面重试' },
        { status: 400 }
      );
    }

    // Check usage limit
    let usageLimit = await db.usageLimit.findUnique({
      where: { fingerprint },
    });

    if (!usageLimit) {
      usageLimit = await db.usageLimit.create({
        data: { fingerprint },
      });
    }

    if (usageLimit.generateCount >= MAX_FREE_GENERATIONS) {
      return NextResponse.json(
        { error: '免费生成次数已用完', used: true },
        { status: 429 }
      );
    }

    // Call LLM to generate name suggestions
    const result = await generateNames({
      bazi,
      birthPlace,
      platform,
      requirements,
      lockedWords,
    });

    // Save generation result to database
    await db.evaluation.create({
      data: {
        fingerprint,
        type: 'generate',
        name: lockedWords || '生成建议',
        birthPlace: birthPlace || null,
        bazi: bazi || null,
        platform: platform || null,
        results: JSON.stringify(result),
      },
    });

    // Update usage limit
    await db.usageLimit.update({
      where: { fingerprint },
      data: {
        generateCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: '生成服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
