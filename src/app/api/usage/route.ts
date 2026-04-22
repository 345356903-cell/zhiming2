import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FREE_LIMIT_PER_DAY = 5;
const SHARE_BONUS = 2;     // Each share gives +2
const MAX_SHARE_BONUS = 10; // Max bonus from sharing (5 shares = 10 extra)
const STREAK_BONUS_MAX = 5; // Max streak bonus (1 per day, max 5)

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
  if (lastVisitDate === today) return currentStreak; // Already visited today
  if (lastVisitDate === yesterday) return Math.min(currentStreak + 1, STREAK_BONUS_MAX); // Consecutive day
  return 1; // Streak broken, start fresh
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fingerprint = searchParams.get('fingerprint');

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Missing fingerprint parameter' },
        { status: 400 }
      );
    }

    const today = getTodayStr();
    let usageLimit = await db.usageLimit.findUnique({
      where: { fingerprint },
    });

    // Create if not exists
    if (!usageLimit) {
      usageLimit = await db.usageLimit.create({
        data: { fingerprint, resetDate: today, lastVisitDate: today, streak: 1 },
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

    // Daily reset: if the stored resetDate is not today, reset counts
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

    const evaluateCount = usageLimit.evaluateCount;
    const generateCount = usageLimit.generateCount;
    const shareCount = usageLimit.shareCount;
    const streak = usageLimit.streak;

    // Calculate limits: base 5 + streak bonus (1 per day, max 5) + share bonus (each share adds 2, max 10)
    const streakBonus = Math.min(streak, STREAK_BONUS_MAX);
    const bonusFromShares = Math.min(shareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const evalLimit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;
    const genLimit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;

    // Calculate time until midnight for countdown
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const secondsUntilReset = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    return NextResponse.json({
      evaluateCount,
      generateCount,
      shareCount,
      streak,
      streakBonus,
      evalLimit,
      genLimit,
      evaluateUsed: evaluateCount >= evalLimit,
      generateUsed: generateCount >= genLimit,
      freeLimit: FREE_LIMIT_PER_DAY,
      shareBonus: SHARE_BONUS,
      maxShareBonus: MAX_SHARE_BONUS,
      secondsUntilReset,
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to query usage' },
      { status: 500 }
    );
  }
}

// POST: share-to-unlock handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fingerprint } = body;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Missing fingerprint' },
        { status: 400 }
      );
    }

    const today = getTodayStr();
    let usageLimit = await db.usageLimit.findUnique({
      where: { fingerprint },
    });

    if (!usageLimit) {
      usageLimit = await db.usageLimit.create({
        data: { fingerprint, resetDate: today, lastVisitDate: today, streak: 1 },
      });
    }

    // Daily reset check
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

    // Increment share count
    const newShareCount = usageLimit.shareCount + 1;
    usageLimit = await db.usageLimit.update({
      where: { fingerprint },
      data: { shareCount: newShareCount },
    });

    const streak = usageLimit.streak;
    const streakBonus = Math.min(streak, STREAK_BONUS_MAX);
    const bonusFromShares = Math.min(newShareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const evalLimit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;
    const genLimit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;

    return NextResponse.json({
      success: true,
      shareCount: newShareCount,
      streak,
      streakBonus,
      bonusFromShares,
      evalLimit,
      genLimit,
      evaluateCount: usageLimit.evaluateCount,
      generateCount: usageLimit.generateCount,
      evaluateUsed: usageLimit.evaluateCount >= evalLimit,
      generateUsed: usageLimit.generateCount >= genLimit,
    });
  } catch (error) {
    console.error('Usage share API error:', error);
    return NextResponse.json(
      { error: 'Failed to record share' },
      { status: 500 }
    );
  }
}
