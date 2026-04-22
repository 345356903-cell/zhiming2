import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateName } from '@/lib/llm';

const MAX_FREE_EVALUATIONS = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, birthDate, bazi, birthPlace, platform, fingerprint } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: '请输入要评测的网名' },
        { status: 400 }
      );
    }

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

    if (usageLimit.evaluateCount >= MAX_FREE_EVALUATIONS) {
      return NextResponse.json(
        { error: '免费评测次数已用完', used: true },
        { status: 429 }
      );
    }

    // Call LLM to evaluate the name
    const result = await evaluateName({
      name: name.trim(),
      birthDate,
      bazi,
      birthPlace,
      platform,
    });

    // Save evaluation result to database
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

    // Update usage limit
    await db.usageLimit.update({
      where: { fingerprint },
      data: {
        evaluateCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Evaluate API error:', error);
    return NextResponse.json(
      { error: '评测服务异常，请稍后重试' },
      { status: 500 }
    );
  }
}
