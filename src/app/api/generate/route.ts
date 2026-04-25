import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateNames } from '@/lib/llm';

const FREE_LIMIT_PER_DAY = 5;
const SHARE_BONUS = 2;
const MAX_SHARE_BONUS = 10;
const STREAK_BONUS_MAX = 5;

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calculateStreak(lastVisitDate: string, currentStreak: number, today: string): number {
  const yesterday = getYesterdayStr();
  if (lastVisitDate === today) return currentStreak;
  if (lastVisitDate === yesterday) return Math.min(currentStreak + 1, STREAK_BONUS_MAX);
  return 1;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bazi, birthPlace, platform, requirements, lockedWords, fingerprint, lang } = body;

    // Validate required fields
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

    // Update streak
    const newStreak = calculateStreak(usageLimit.lastVisitDate, usageLimit.streak, today);
    if (newStreak !== usageLimit.streak || usageLimit.lastVisitDate !== today) {
      usageLimit = await db.usageLimit.update({
        where: { fingerprint },
        data: { streak: newStreak, lastVisitDate: today },
      });
    }

    const streakBonus = Math.min(usageLimit.streak, STREAK_BONUS_MAX);
    const bonusFromShares = Math.min(usageLimit.shareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const genLimit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;

    if (usageLimit.generateCount >= genLimit) {
      return NextResponse.json(
        { error: 'Daily free generations exhausted', used: true, limit: genLimit },
        { status: 429 }
      );
    }

    // Call LLM to generate name suggestions (with deterministic score override per name)
    const result = await generateNames({
      bazi,
      birthPlace,
      platform,
      requirements,
      lockedWords,
      lang,
    });

    // Save generation result to database
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
      { error: 'Generation service error, please try again' },
      { status: 500 }
    );
  }
}
