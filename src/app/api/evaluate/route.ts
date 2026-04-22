import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evaluateName } from '@/lib/llm';

const FREE_LIMIT_PER_DAY = 3;
const SHARE_BONUS = 2;
const MAX_SHARE_BONUS = 4;

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, birthDate, bazi, birthPlace, platform, fingerprint } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Please enter a name to evaluate' },
        { status: 400 }
      );
    }

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json(
        { error: 'Missing fingerprint, please refresh the page' },
        { status: 400 }
      );
    }

    // Check usage limit with daily reset
    const today = getTodayStr();
    let usageLimit = await db.usageLimit.findUnique({
      where: { fingerprint },
    });

    if (!usageLimit) {
      usageLimit = await db.usageLimit.create({
        data: { fingerprint, resetDate: today },
      });
    }

    // Daily reset
    if (usageLimit.resetDate !== today) {
      usageLimit = await db.usageLimit.update({
        where: { fingerprint },
        data: {
          evaluateCount: 0,
          generateCount: 0,
          shareCount: 0,
          resetDate: today,
        },
      });
    }

    const bonusFromShares = Math.min(usageLimit.shareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const evalLimit = FREE_LIMIT_PER_DAY + bonusFromShares;

    if (usageLimit.evaluateCount >= evalLimit) {
      return NextResponse.json(
        { error: 'Daily free evaluations exhausted', used: true, limit: evalLimit },
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
      { error: 'Evaluation service error, please try again' },
      { status: 500 }
    );
  }
}
