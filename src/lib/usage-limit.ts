import { db } from '@/lib/db'

const FREE_LIMIT = 5
const SHARE_BONUS = 2
const MAX_SHARE_BONUS = 10
const STREAK_MAX = 5

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function yesterday(): string {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcStreak(lastVisit: string, streak: number, t: string): number {
  if (lastVisit === t) return streak
  if (lastVisit === yesterday()) return Math.min(streak + 1, STREAK_MAX)
  return 1
}

export function calcLimits(streak: number, shareCount: number) {
  const streakBonus = Math.min(streak, STREAK_MAX)
  const shareBonus = Math.min(shareCount * SHARE_BONUS, MAX_SHARE_BONUS)
  return { limit: FREE_LIMIT + streakBonus + shareBonus, streakBonus, shareBonus }
}

export async function ensureUsage(fingerprint: string) {
  const t = today()
  let r = await db.usageLimit.findUnique({ where: { fingerprint } })

  if (!r) {
    r = await db.usageLimit.create({ data: { fingerprint, resetDate: t, lastVisitDate: t, streak: 1 } })
  }

  // Daily reset
  if (r.resetDate !== t) {
    r = await db.usageLimit.update({
      where: { fingerprint },
      data: { evaluateCount: 0, generateCount: 0, shareCount: 0, resetDate: t },
    })
  }

  // Streak update
  const newStreak = calcStreak(r.lastVisitDate, r.streak, t)
  if (newStreak !== r.streak || r.lastVisitDate !== t) {
    r = await db.usageLimit.update({
      where: { fingerprint },
      data: { streak: newStreak, lastVisitDate: t },
    })
  }

  return r
}

export function secondsUntilReset(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}
