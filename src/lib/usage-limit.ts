import { db } from '@/lib/db';

export const FREE_LIMIT_PER_DAY = 5;
export const SHARE_BONUS = 2;
export const MAX_SHARE_BONUS = 10;
export const STREAK_BONUS_MAX = 5;

export function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function calculateStreak(lastVisitDate: string, currentStreak: number, today: string): number {
  const yesterday = getYesterdayStr();
  if (lastVisitDate === today) return currentStreak;
  if (lastVisitDate === yesterday) return Math.min(currentStreak + 1, STREAK_BONUS_MAX);
  return 1;
}

export function calcLimits(streak: number, shareCount: number) {
  const streakBonus = Math.min(streak, STREAK_BONUS_MAX);
  const bonusFromShares = Math.min(shareCount * SHARE_BONUS, MAX_SHARE_BONUS);
  const limit = FREE_LIMIT_PER_DAY + streakBonus + bonusFromShares;
  return { limit, streakBonus, bonusFromShares };
}

/** Ensure usage record exists, apply daily reset + streak update. Returns fresh record. */
export async function ensureUsageRecord(fingerprint: string) {
  const today = getTodayStr();
  let record = await db.usageLimit.findUnique({ where: { fingerprint } });

  if (!record) {
    record = await db.usageLimit.create({
      data: { fingerprint, resetDate: today, lastVisitDate: today, streak: 1 },
    });
  }

  // Daily reset
  if (record.resetDate !== today) {
    record = await db.usageLimit.update({
      where: { fingerprint },
      data: { evaluateCount: 0, generateCount: 0, shareCount: 0, resetDate: today },
    });
  }

  // Streak update
  const newStreak = calculateStreak(record.lastVisitDate, record.streak, today);
  if (newStreak !== record.streak || record.lastVisitDate !== today) {
    record = await db.usageLimit.update({
      where: { fingerprint },
      data: { streak: newStreak, lastVisitDate: today },
    });
  }

  return record;
}
