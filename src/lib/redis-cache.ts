import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

if (!redisUrl || !redisToken) {
  throw new Error('Missing required environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

const FREE_LIMIT = 10
const CACHE_TTL = 24 * 60 * 60 // 24 hours

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getRateLimit(fingerprint: string): Promise<{
  evaluateCount: number
  generateCount: number
  resetDate: string
}> {
  const key = `rate:${fingerprint}`
  const data = await redis.get<{ evaluateCount: number; generateCount: number; resetDate: string }>(key)

  if (data && data.resetDate === today()) {
    return data
  }

  const newData = {
    evaluateCount: 0,
    generateCount: 0,
    resetDate: today(),
  }

  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify(newData))
  } catch (e) {
    console.error('Failed to set rate limit in Redis:', e)
  }
  return newData
}

export async function incrementEvaluateCount(fingerprint: string): Promise<boolean> {
  const key = `rate:${fingerprint}`
  const data = await getRateLimit(fingerprint)

  if (data.evaluateCount >= FREE_LIMIT) {
    return false
  }

  data.evaluateCount++
  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to increment evaluate count:', e)
  }
  return true
}

export async function incrementGenerateCount(fingerprint: string): Promise<boolean> {
  const key = `rate:${fingerprint}`
  const data = await getRateLimit(fingerprint)

  if (data.generateCount >= FREE_LIMIT) {
    return false
  }

  data.generateCount++
  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to increment generate count:', e)
  }
  return true
}

export async function getCachedResult<T>(
  cacheKey: string,
): Promise<T | null> {
  const cached = await redis.get<T>(cacheKey)
  return cached || null
}

export async function setCachedResult<T>(
  cacheKey: string,
  data: T,
  ttl: number = CACHE_TTL,
): Promise<void> {
  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to set cached result:', e)
  }
}

export function secondsUntilReset(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}