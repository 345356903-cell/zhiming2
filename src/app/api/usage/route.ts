import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FREE_LIMIT_PER_DAY = 3;
const SHARE_BONUS = 2;
const MAX_SHARE_BONUS = 4; // Max bonus from sharing (2 shares = 4 extra)

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
        data: { fingerprint, resetDate: today },
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

    // Calculate limits: base 3 + share bonus (each share adds 2, max 4 bonus)
    const bonusFromShares = Math.min(shareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const evalLimit = FREE_LIMIT_PER_DAY + bonusFromShares;
    const genLimit = FREE_LIMIT_PER_DAY + bonusFromShares;

    return NextResponse.json({
      evaluateCount,
      generateCount,
      shareCount,
      evalLimit,
      genLimit,
      evaluateUsed: evaluateCount >= evalLimit,
      generateUsed: generateCount >= genLimit,
      freeLimit: FREE_LIMIT_PER_DAY,
      shareBonus: SHARE_BONUS,
      maxShareBonus: MAX_SHARE_BONUS,
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
        data: { fingerprint, resetDate: today },
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

    const bonusFromShares = Math.min(newShareCount * SHARE_BONUS, MAX_SHARE_BONUS);
    const evalLimit = FREE_LIMIT_PER_DAY + bonusFromShares;
    const genLimit = FREE_LIMIT_PER_DAY + bonusFromShares;

    return NextResponse.json({
      success: true,
      shareCount: newShareCount,
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
