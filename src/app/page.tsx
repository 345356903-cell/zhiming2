'use client'

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, ArrowLeft, Lock, Share2,
  Star, Loader2, Languages, HelpCircle,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import { type Lang, t } from '@/lib/i18n'

// ===================== CONSTANTS =====================

const PLATFORMS = [
  { value: 'wechat', labelZh: '微信', labelEn: 'WeChat', region: 'cn' },
  { value: 'douyin', labelZh: '抖音', labelEn: 'Douyin', region: 'cn' },
  { value: 'xiaohongshu', labelZh: '小红书', labelEn: 'RED', region: 'cn' },
  { value: 'weibo', labelZh: '微博', labelEn: 'Weibo', region: 'cn' },
  { value: 'bilibili', labelZh: 'B站', labelEn: 'Bilibili', region: 'cn' },
  { value: 'qq', labelZh: 'QQ', labelEn: 'QQ', region: 'cn' },
  { value: 'tiktok', labelZh: 'TikTok', labelEn: 'TikTok', region: 'global' },
  { value: 'instagram', labelZh: 'Instagram', labelEn: 'Instagram', region: 'global' },
  { value: 'twitter', labelZh: 'X / Twitter', labelEn: 'X / Twitter', region: 'global' },
  { value: 'youtube', labelZh: 'YouTube', labelEn: 'YouTube', region: 'global' },
  { value: 'discord', labelZh: 'Discord', labelEn: 'Discord', region: 'global' },
  { value: 'threads', labelZh: 'Threads', labelEn: 'Threads', region: 'global' },
  { value: 'snapchat', labelZh: 'Snapchat', labelEn: 'Snapchat', region: 'global' },
  { value: 'reddit', labelZh: 'Reddit', labelEn: 'Reddit', region: 'global' },
  { value: 'twitch', labelZh: 'Twitch', labelEn: 'Twitch', region: 'global' },
  { value: 'other', labelZh: '其他', labelEn: 'Other', region: 'other' },
]

const YEAR_MIN = 1940
const YEAR_MAX = new Date().getFullYear()
const YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// v1.1.1 — Premium Apple Design palette with dark/light support
const C_DARK = {
  bg: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  separator: '#38383A',
  accent: '#C9A55C',
  accentHover: '#D4B36E',
  accentDim: 'rgba(201,165,92,0.07)',
  accentGlow: 'rgba(201,165,92,0.03)',
  text1: '#F5F5F7',
  text2: '#86868B',
  text3: '#48484A',
  shadow: '0 1px 8px rgba(0,0,0,0.12)',
  shadowMd: '0 2px 20px rgba(0,0,0,0.22)',
  shadowLg: '0 8px 40px rgba(0,0,0,0.35)',
  insetBorder: 'inset 0 0 0 0.5px rgba(255,255,255,0.06)',
  insetBorderAccent: 'inset 0 0 0 0.5px rgba(201,165,92,0.12)',
  headerBg: 'rgba(0,0,0,0.72)',
  headerBorder: 'rgba(255,255,255,0.08)',
  buttonBg: 'rgba(255,255,255,0.06)',
  overlayBg: 'rgba(0,0,0,0.88)',
  baziInnerBg: 'rgba(0,0,0,0.25)',
  shareBarBg: 'rgba(28,28,30,0.72)',
  colorScheme: 'dark' as const,
}

const C_LIGHT = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  cardElevated: '#F0F0F2',
  separator: '#D2D2D7',
  accent: '#B08930',
  accentHover: '#C49A3E',
  accentDim: 'rgba(176,137,48,0.08)',
  accentGlow: 'rgba(176,137,48,0.04)',
  text1: '#1D1D1F',
  text2: '#6E6E73',
  text3: '#AEAEB2',
  shadow: '0 1px 8px rgba(0,0,0,0.06)',
  shadowMd: '0 2px 20px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 40px rgba(0,0,0,0.10)',
  insetBorder: 'inset 0 0 0 0.5px rgba(0,0,0,0.06)',
  insetBorderAccent: 'inset 0 0 0 0.5px rgba(176,137,48,0.12)',
  headerBg: 'rgba(245,245,247,0.72)',
  headerBorder: 'rgba(0,0,0,0.06)',
  buttonBg: 'rgba(0,0,0,0.04)',
  overlayBg: 'rgba(245,245,247,0.88)',
  baziInnerBg: 'rgba(0,0,0,0.04)',
  shareBarBg: 'rgba(255,255,255,0.72)',
  colorScheme: 'light' as const,
}

type ThemeColors = typeof C_DARK

// Apple system font stack
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
const FONT_MONO = "'SF Mono', ui-monospace, Menlo, monospace"

// Apple-style ease curves
const EASE_OUT = [0.16, 1, 0.3, 1] as const
const SPRING = { type: 'spring' as const, stiffness: 280, damping: 28 }

// ===================== FINGERPRINT =====================

function generateFingerprint(): string {
  const nav = navigator
  const screen = window.screen
  const raw = [nav.userAgent, nav.language, screen.width + 'x' + screen.height, screen.colorDepth, new Date().getTimezoneOffset(), nav.hardwareConcurrency || 0].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) { const char = raw.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash }
  return 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36)
}

function getOrCreateFingerprint(): string {
  if (typeof window === 'undefined') return ''
  const stored = localStorage.getItem('name_eval_fp')
  if (stored) return stored
  const fp = generateFingerprint()
  localStorage.setItem('name_eval_fp', fp)
  return fp
}

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'zh'
  const stored = localStorage.getItem('namevibe_lang') as Lang | null
  if (stored === 'zh' || stored === 'en') return stored
  const navLang = navigator.language?.toLowerCase() || ''
  return navLang.startsWith('zh') ? 'zh' : 'en'
}

// System theme detection — useSyncExternalStore avoids both
// hydration mismatch (getServerSnapshot returns 'dark') and
// the lint warning about setState inside useEffect.
function subscribeTheme(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getThemeSnapshot(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getThemeServerSnapshot(): 'dark' {
  return 'dark'
}

function useSystemTheme(): 'dark' | 'light' {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot)
}

// ===================== BAZI HOOK =====================

interface BaziData {
  bazi: string; baziBrief: string; wuxing: string; nayin: string
  solarDate: string; lunarDate: string; shengxiao: string; xingzuo: string
  missingElements: string[]; yearPillar: string; monthPillar: string
  dayPillar: string; hourPillar: string
}

function useBazi() {
  const [baziData, setBaziData] = useState<BaziData | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = useCallback(async (birthDate: string, birthTime: string, calendarType: string, isLeapMonth?: boolean) => {
    if (!birthDate) { setBaziData(null); return }
    setLoading(true)
    try {
      const res = await fetch('/api/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, birthTime, calendarType, isLeapMonth }),
      })
      const data = await res.json()
      if (data.success) setBaziData(data.data)
      else setBaziData(null)
    } catch { setBaziData(null) }
    finally { setLoading(false) }
  }, [])

  const reset = useCallback(() => setBaziData(null), [])

  return { baziData, loading, calculate, reset }
}

// ===================== TYPES =====================

type AppView = 'home' | 'evaluating' | 'eval-result' | 'generating' | 'gen-result' | 'gen-eval-result'

interface UsageState {
  evaluateUsed: boolean; generateUsed: boolean
  evaluateCount: number; generateCount: number
  evalLimit: number; genLimit: number; shareCount: number
  streak: number; streakBonus: number; secondsUntilReset: number
}

// ===================== SCORE VERDICT =====================

function getScoreVerdict(score: number, lang: Lang): string {
  if (score >= 90) return t('verdictGodTier', lang)
  if (score >= 75) return t('verdictGreat', lang)
  if (score >= 55) return t('verdictDecent', lang)
  if (score >= 35) return t('verdictMeh', lang)
  return t('verdictDanger', lang)
}

// ===================== DATE HELPER =====================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ===================== MAIN APP =====================

export default function Home() {
  const systemTheme = useSystemTheme()
  const C = systemTheme === 'dark' ? C_DARK : C_LIGHT
  const isDark = systemTheme === 'dark'

  const [view, setView] = useState<AppView>('home')
  const [mode, setMode] = useState<'evaluate' | 'generate'>('evaluate')
  const [fingerprint, setFingerprint] = useState('')
  const [lang, setLang] = useState<Lang>('zh')
  const [usage, setUsage] = useState<UsageState>({ evaluateUsed: false, generateUsed: false, evaluateCount: 0, generateCount: 0, evalLimit: 5, genLimit: 5, shareCount: 0, streak: 0, streakBonus: 0, secondsUntilReset: 0 })
  const [evalResult, setEvalResult] = useState<any>(null)
  const [genResult, setGenResult] = useState<any>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showManual, setShowManual] = useState(false)

  const [nameInput, setNameInput] = useState('')
  const [birthYear, setBirthYear] = useState(2000)
  const [birthMonth, setBirthMonth] = useState(1)
  const [birthDay, setBirthDay] = useState(1)
  const [birthTime, setBirthTime] = useState('')
  const [calendarType, setCalendarType] = useState('solar')
  const [birthPlace, setBirthPlace] = useState('')
  const [platform, setPlatform] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [lockedWords, setLockedWords] = useState('')
  const [nameError, setNameError] = useState('')

  const { baziData, loading: baziLoading, calculate: calculateBazi, reset: resetBazi } = useBazi()

  const birthDate = useMemo(() => {
    const m = String(birthMonth).padStart(2, '0')
    const d = String(birthDay).padStart(2, '0')
    return `${birthYear}-${m}-${d}`
  }, [birthYear, birthMonth, birthDay])

  const daysInMonth = useMemo(() => getDaysInMonth(birthYear, birthMonth), [birthYear, birthMonth])

  useEffect(() => {
    if (birthDay > daysInMonth) setBirthDay(daysInMonth)
  }, [daysInMonth, birthDay])

  useEffect(() => {
    setFingerprint(getOrCreateFingerprint())
    setLang(getInitialLang())
    const now = new Date()
    setBirthYear(now.getFullYear())
    setBirthMonth(now.getMonth() + 1)
    setBirthDay(now.getDate())
  }, [])
  useEffect(() => { if (fingerprint) fetchUsage() }, [fingerprint])

  useEffect(() => {
    if (birthDate) {
      const timer = setTimeout(() => calculateBazi(birthDate, birthTime || '12:00', calendarType), 600)
      return () => clearTimeout(timer)
    } else {
      resetBazi()
    }
  }, [birthDate, birthTime, calendarType, calculateBazi])

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      localStorage.setItem('namevibe_lang', next)
      return next
    })
  }, [])

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/usage?fingerprint=${fingerprint}`)
      if (res.ok) {
        const d = await res.json()
        setUsage({
          evaluateUsed: d.evaluateUsed, generateUsed: d.generateUsed,
          evaluateCount: d.evaluateCount, generateCount: d.generateCount,
          evalLimit: d.evalLimit || 5, genLimit: d.genLimit || 5, shareCount: d.shareCount || 0,
          streak: d.streak || 0, streakBonus: d.streakBonus || 0, secondsUntilReset: d.secondsUntilReset || 0,
        })
      }
    } catch {}
  }

  const handleShare = useCallback(async () => {
    const score = evalResult?.overallScore || '??'
    const name = evalResult?.name || nameInput || '??'
    const text = t('shareText', lang, { score, name })
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: 'ZhiMing', text, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {})
    }
    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      })
      if (res.ok) {
        const d = await res.json()
        setUsage(prev => ({
          ...prev,
          shareCount: d.shareCount ?? prev.shareCount,
          evalLimit: d.evalLimit ?? prev.evalLimit,
          genLimit: d.genLimit ?? prev.genLimit,
          evaluateUsed: d.evaluateUsed ?? prev.evaluateUsed,
          generateUsed: d.generateUsed ?? prev.generateUsed,
        }))
      }
    } catch {}
    alert(t('linkCopied', lang))
  }, [evalResult, fingerprint, lang])

  const handleEvaluate = async () => {
    if (!nameInput.trim()) { setNameError(t('onlineNameRequired', lang)); return }
    setNameError('')
    setIsLoading(true); setView('evaluating')
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), birthDate, bazi: baziData?.baziBrief || '', birthPlace, platform, fingerprint, lang }),
      })
      if (res.status === 429) { setShowPaywall(true); setView('home'); return }
      const data = await res.json()
      setEvalResult(data.data || data)
      setView('eval-result')
    } catch { setView('home') }
    finally { setIsLoading(false); fetchUsage() }
  }

  const handleGenerate = async () => {
    setIsLoading(true); setView('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bazi: baziData?.baziBrief || '', birthPlace, platform, requirements: specialRequirements, lockedWords, fingerprint, lang }),
      })
      if (res.status === 429) { setShowPaywall(true); setView('home'); return }
      const data = await res.json()
      setGenResult(data.data || data)
      setView('gen-result')
    } catch { setView('home') }
    finally { setIsLoading(false); fetchUsage() }
  }

  const handleNameSelect = useCallback(async (name: string) => {
    setSelectedName(name); setView('gen-eval-result'); setIsLoading(true)
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fingerprint, lang }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setEvalResult({ overallScore: 0, summary: t('lockedContent', lang), nameInterpretation: `${lang === 'zh' ? '你选择了' : 'You selected'} "${name}". ${t('lockedContent', lang)}`, ambiguityCheck: t('locked', lang), yiXueScore: 0, onlineUsageAnalysis: t('locked', lang), influencerLevel: 0, acceptanceLevel: 0, viralPotential: t('locked', lang), renameSuggestions: t('locked', lang) })
      } else { setEvalResult(data.data || data) }
    } catch { setView('home') }
    finally { setIsLoading(false); fetchUsage() }
  }, [fingerprint, lang])

  const handleBack = useCallback(() => { setView('home'); setEvalResult(null); setGenResult(null); setSelectedName(null) }, [])

  const platformLabel = (p: typeof PLATFORMS[0]) => lang === 'zh' ? p.labelZh : p.labelEn

  // =================== RENDER ===================

  // Shared input style for Apple consistency (theme-aware)
  const inputStyle = {
    background: C.cardElevated,
    color: C.text1,
    fontFamily: FONT_STACK,
    boxShadow: C.insetBorder,
  }

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: C.bg, fontFamily: FONT_STACK }}>
      {/* ═══════ Header — Frosted glass, Apple nav bar ═══════ */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: C.headerBg,
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: `0.5px solid ${C.headerBorder}`,
        }}
      >
        <div className="max-w-[480px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-v11.png" alt="M" width={30} height={30} className="rounded-[8px]" priority />
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: C.text1 }}>
              {t('appName', lang)}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowManual(true)}
              className="flex items-center justify-center w-[34px] h-[34px] rounded-full transition-all duration-200 active:scale-[0.88]"
              style={{ background: C.buttonBg, color: C.text2 }}
              title={t('manualTitle', lang)}
            >
              <HelpCircle className="w-[16px] h-[16px]" />
            </button>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 active:scale-[0.88] min-h-[34px]"
              style={{ background: C.buttonBg, color: C.text2 }}
              title={lang === 'zh' ? 'Switch to English' : '切换中文'}
            >
              <Languages className="w-[14px] h-[14px]" />
              <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1 relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[480px] mx-auto px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            {/* ═══════ HOME VIEW ═══════ */}
            {(view === 'home') && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {/* Hero — Apple.com style: massive breathing room, clean type */}
                <div className="text-center mb-8 pt-4">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.6, ease: EASE_OUT }}
                  >
                    <h1
                      className="text-[32px] font-bold tracking-tight"
                      style={{ color: C.text1, lineHeight: 1.15 }}
                    >
                      {t('heroTitle1', lang)}
                      <br />
                      <span style={{ color: C.accent }}>{t('heroTitle2', lang)}</span>
                    </h1>
                    <p
                      className="text-[14px] mt-3 font-light"
                      style={{ color: C.text2, lineHeight: 1.6 }}
                    >
                      {t('heroSub', lang)}
                    </p>
                  </motion.div>

                  {/* iOS-style Segmented Control */}
                  <motion.div
                    className="mt-7 mx-auto relative flex rounded-[12px] p-[3px]"
                    style={{ background: C.card }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.5, ease: EASE_OUT }}
                  >
                    {/* Sliding highlight indicator */}
                    <motion.div
                      className="absolute top-[3px] bottom-[3px] rounded-[10px]"
                      style={{ background: C.cardElevated, boxShadow: C.shadow }}
                      animate={{ left: mode === 'evaluate' ? '3px' : '50%', width: 'calc(50% - 4.5px)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                    <button
                      onClick={() => setMode('evaluate')}
                      className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px]"
                      style={{ color: mode === 'evaluate' ? C.text1 : C.text3 }}
                    >
                      <Star className="w-[14px] h-[14px]" /> {t('rateMyName', lang)}
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px]"
                      style={{ color: mode === 'generate' ? C.text1 : C.text3 }}
                    >
                      <Zap className="w-[14px] h-[14px]" /> {t('generateName', lang)}
                    </button>
                  </motion.div>
                </div>

                {/* Form Card — Premium Apple: generous padding, soft depth */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: EASE_OUT }}
                >
                  <Card
                    className="rounded-[24px] overflow-hidden"
                    style={{ background: C.card, border: 'none', boxShadow: C.shadowMd }}
                  >
                    <CardContent className="p-6 space-y-6">
                      {/* Name Input (evaluate mode only) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-2">
                          <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                            {t('onlineName', lang)} <span style={{ color: C.accent }}>*</span>
                          </Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder={t('onlineNamePlaceholder', lang)}
                            className="h-[48px] rounded-[16px] text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                            style={inputStyle}
                          />
                          {nameError && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[12px]"
                              style={{ color: C.accent }}
                            >
                              {nameError}
                            </motion.p>
                          )}
                        </div>
                      )}

                      {/* Birth Date — 3-Select Picker */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                            {t('birthDate', lang)}
                          </Label>
                          {/* Calendar toggle — iOS pill style */}
                          <div
                            className="flex rounded-[9px] p-[2px] gap-[2px]"
                            style={{ background: C.cardElevated }}
                          >
                            <button
                              onClick={() => setCalendarType('solar')}
                              className="px-3 py-[4px] rounded-[7px] text-[11px] font-medium transition-all duration-200"
                              style={calendarType === 'solar'
                                ? { background: C.separator, color: C.text1 }
                                : { color: C.text3 }
                              }
                            >
                              {t('calendarSolar', lang)}
                            </button>
                            <button
                              onClick={() => setCalendarType('lunar')}
                              className="px-3 py-[4px] rounded-[7px] text-[11px] font-medium transition-all duration-200"
                              style={calendarType === 'lunar'
                                ? { background: C.separator, color: C.text1 }
                                : { color: C.text3 }
                              }
                            >
                              {t('calendarLunar', lang)}
                            </button>
                          </div>
                        </div>

                        {/* 3-Column Date Selector */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <Select value={String(birthYear)} onValueChange={(v) => setBirthYear(Number(v))}>
                            <SelectTrigger
                              className="h-[48px] rounded-[16px] text-[15px] border-0"
                              style={inputStyle}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className="rounded-[16px] max-h-48"
                              style={{ background: C.cardElevated, border: 'none', boxShadow: C.shadowLg }}
                            >
                              {YEARS.map(y => (
                                <SelectItem key={y} value={String(y)} className="text-[14px]" style={{ color: C.text2 }}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={String(birthMonth)} onValueChange={(v) => setBirthMonth(Number(v))}>
                            <SelectTrigger
                              className="h-[48px] rounded-[16px] text-[15px] border-0"
                              style={inputStyle}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className="rounded-[16px] max-h-48"
                              style={{ background: C.cardElevated, border: 'none', boxShadow: C.shadowLg }}
                            >
                              {MONTHS.map(m => (
                                <SelectItem key={m} value={String(m)} className="text-[14px]" style={{ color: C.text2 }}>{m}{lang === 'zh' ? '月' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={String(birthDay)} onValueChange={(v) => setBirthDay(Number(v))}>
                            <SelectTrigger
                              className="h-[48px] rounded-[16px] text-[15px] border-0"
                              style={inputStyle}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className="rounded-[16px] max-h-48"
                              style={{ background: C.cardElevated, border: 'none', boxShadow: C.shadowLg }}
                            >
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                <SelectItem key={d} value={String(d)} className="text-[14px]" style={{ color: C.text2 }}>{d}{lang === 'zh' ? '日' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Birth time */}
                        <div className="flex items-center gap-3">
                          <Label className="text-[12px] shrink-0" style={{ color: C.text3 }}>{t('birthTime', lang)}</Label>
                          <Input
                            type="time"
                            value={birthTime}
                            onChange={(e) => setBirthTime(e.target.value)}
                            className="h-[36px] rounded-[12px] text-[13px] flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            style={{ ...inputStyle, colorScheme: isDark ? 'dark' : 'light' }}
                          />
                        </div>
                      </div>

                      {/* Auto Bazi Display — Premium frosted card */}
                      {baziData && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.4, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <div
                            className="rounded-[20px] p-5"
                            style={{
                              background: `linear-gradient(135deg, ${C.accentGlow}, rgba(212,169,106,0.02))`,
                              boxShadow: `inset 0 0 0 0.5px rgba(212,169,106,0.08)`,
                            }}
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <span
                                className="text-[11px] font-semibold tracking-[0.08em] uppercase"
                                style={{ color: C.accent }}
                              >
                                {t('autoBazi', lang)}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-2.5 text-center">
                              {[
                                { label: t('year', lang), val: baziData.yearPillar },
                                { label: t('month', lang), val: baziData.monthPillar },
                                { label: t('day', lang), val: baziData.dayPillar },
                                { label: t('hour', lang), val: baziData.hourPillar },
                              ].map(p => (
                                <div
                                  key={p.label}
                                  className="rounded-[14px] py-2.5"
                                  style={{ background: C.baziInnerBg }}
                                >
                                  <div className="font-bold text-[16px]" style={{ color: C.text1 }}>{p.val}</div>
                                  <div className="text-[10px] mt-1 font-medium" style={{ color: C.text3 }}>{p.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[11px]" style={{ color: C.text3 }}>
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && (
                                <span style={{ color: `${C.accent}90` }}>{t('missing', lang)}{baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-2.5 text-[12px]" style={{ color: C.text3 }}>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('calculatingBazi', lang)}
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                          {t('birthPlace', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span>
                        </Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder={t('birthPlacePlaceholder', lang)}
                          className="h-[48px] rounded-[16px] text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                          style={inputStyle}
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                          {t('mainPlatform', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span>
                        </Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger
                            className="h-[48px] rounded-[16px] text-[15px] border-0"
                            style={inputStyle}
                          >
                            <SelectValue placeholder={t('selectPlatform', lang)} />
                          </SelectTrigger>
                          <SelectContent
                            className="rounded-[16px] max-h-56"
                            style={{ background: C.cardElevated, border: 'none', boxShadow: C.shadowLg }}
                          >
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.text3 }}>{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-[14px]" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] mt-1" style={{ color: C.text3 }}>{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-[14px]" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-[14px]" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                              {t('specialRequirements', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span>
                            </Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder={t('specialRequirementsPlaceholder', lang)}
                              className="min-h-[80px] rounded-[16px] text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                              style={inputStyle}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium" style={{ color: C.text1 }}>
                              {t('lockWords', lang)} <span style={{ color: C.text3 }}>({t('lockWordsHint', lang)})</span>
                            </Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder={t('lockWordsPlaceholder', lang)}
                              className="h-[48px] rounded-[16px] text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                              style={inputStyle}
                            />
                          </div>
                        </>
                      )}

                      {/* CTA Button — Apple "Buy" button style */}
                      <Button
                        onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate}
                        disabled={isLoading || (mode === 'evaluate' && usage.evaluateUsed) || (mode === 'generate' && usage.generateUsed)}
                        className="w-full h-[52px] text-[16px] font-semibold rounded-[14px] transition-all duration-200 active:scale-[0.97] border-0 disabled:opacity-40"
                        style={{
                          background: C.accent,
                          color: '#000',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          {mode === 'evaluate'
                            ? <><Star className="w-[17px] h-[17px]" /> {t('analyzeVibe', lang)}</>
                            : <><Zap className="w-[17px] h-[17px]" /> {t('generateNames', lang)}</>
                          }
                        </span>
                      </Button>

                      {/* Usage indicator — Apple subtle caption style */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-center gap-4 text-[12px]" style={{ color: C.text3 }}>
                          <span>{t('rating', lang)}: {Math.max(0, usage.evalLimit - usage.evaluateCount)}/{usage.evalLimit}</span>
                          <span style={{ color: C.separator }}>·</span>
                          <span>{t('generation', lang)}: {Math.max(0, usage.genLimit - usage.generateCount)}/{usage.genLimit}</span>
                        </div>
                        {(usage.streak > 0 || usage.shareCount > 0) && (
                          <div className="flex items-center justify-center gap-2 text-[11px]">
                            {usage.streak > 0 && (
                              <span style={{ color: C.accent }}>🔥 {usage.streak}{t('streakDays', lang)} (+{usage.streakBonus})</span>
                            )}
                            {usage.streak > 0 && usage.shareCount > 0 && <span style={{ color: C.separator }}>·</span>}
                            {usage.shareCount > 0 && (
                              <span style={{ color: C.accent }}>📢 +{usage.shareCount * 2}</span>
                            )}
                          </div>
                        )}
                        <div className="text-center text-[11px]" style={{ color: C.text3 }}>
                          {t('dailyReset', lang)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* ═══════ LOADING OVERLAY — Apple clean ═══════ */}
            {(view === 'evaluating' || view === 'generating') && isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{
                  background: C.overlayBg,
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                }}
              >
                <div className="flex flex-col items-center gap-8">
                  {/* Apple-style refined spinner */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <motion.div
                      className="w-14 h-14 rounded-full"
                      style={{ border: `2px solid ${C.separator}`, borderTopColor: C.accent }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image src="/logo-v11.png" alt="M" width={22} height={22} className="rounded-[6px] opacity-50" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[17px] font-semibold" style={{ color: C.text1 }}>
                      {view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}
                    </p>
                    <p className="text-[14px] mt-2 font-light" style={{ color: C.text2, lineHeight: 1.5 }}>
                      {view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════ EVAL RESULT ═══════ */}
            {view === 'eval-result' && evalResult && (
              <motion.div
                key="eval-result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 mb-5 -ml-1 text-[15px] font-medium min-h-[44px] transition-opacity duration-200 active:opacity-60"
                  style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft className="w-[18px] h-[18px]" /> {t('back', lang)}
                </button>
                <EvalResultCard result={evalResult} lang={lang} C={C} />
              </motion.div>
            )}

            {/* ═══════ GEN RESULT ═══════ */}
            {view === 'gen-result' && genResult && (
              <motion.div
                key="gen-result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 mb-5 -ml-1 text-[15px] font-medium min-h-[44px] transition-opacity duration-200 active:opacity-60"
                  style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft className="w-[18px] h-[18px]" /> {t('back', lang)}
                </button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} lang={lang} C={C} />
              </motion.div>
            )}

            {/* ═══════ GEN EVAL RESULT ═══════ */}
            {view === 'gen-eval-result' && (
              <motion.div
                key="gen-eval-result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 mb-5 -ml-1 text-[15px] font-medium min-h-[44px] transition-opacity duration-200 active:opacity-60"
                  style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <ArrowLeft className="w-[18px] h-[18px]" /> {t('back', lang)}
                </button>
                {selectedName && (
                  <div className="text-center mb-6">
                    <p className="text-[13px] font-medium" style={{ color: C.text2 }}>{t('selectedName', lang)}</p>
                    <p className="text-[28px] font-bold mt-1.5" style={{ color: C.accent }}>{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4 py-16">
                    <div
                      className="w-10 h-10 rounded-full animate-spin"
                      style={{ border: `2px solid ${C.separator}`, borderTopColor: C.accent }}
                    />
                    <p className="text-[14px] font-light" style={{ color: C.text2 }}>{t('evaluatingSelected', lang)}</p>
                  </div>
                ) : evalResult && <EvalResultCard result={evalResult} lang={lang} C={C} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ═══════ Sticky Share Bar — Apple frosted glass ═══════ */}
      <AnimatePresence>
        {(view === 'eval-result' || view === 'gen-eval-result') && evalResult && (
          <motion.div
            key="share-bar"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ ...SPRING, delay: 1.5 }}
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{
              background: C.shareBarBg,
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              borderTop: `0.5px solid ${C.headerBorder}`,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="max-w-[480px] mx-auto px-6 py-3.5">
              <Button
                onClick={handleShare}
                className="w-full h-[52px] font-semibold rounded-[14px] active:scale-[0.97] transition-all duration-200 text-[16px] border-0"
                style={{ background: C.accent, color: '#000', letterSpacing: '-0.01em' }}
              >
                <span className="flex items-center gap-2.5">
                  <Share2 className="w-[17px] h-[17px]" /> {t('shareMyScore', lang)}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Footer — Apple subtle ═══════ */}
      <footer className="mt-auto" style={{ background: C.bg }}>
        <div
          className="max-w-[480px] mx-auto px-6 py-5 flex flex-col items-center gap-2"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <Image src="/logo-v11.png" alt="" width={10} height={10} className="rounded-[3px] opacity-25" />
            <span className="text-[11px] font-light" style={{ color: C.text3 }}>{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-[10px] font-light" style={{ color: `${C.text3}66` }}>{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* ═══════ Paywall Dialog — Premium Apple ═══════ */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent
          className="max-w-sm rounded-[24px]"
          style={{ background: C.card, border: 'none', boxShadow: C.shadowLg }}
        >
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                style={{ background: C.accentDim }}
              >
                <Lock className="w-7 h-7" style={{ color: C.accent }} />
              </div>
            </div>
            <DialogTitle
              className="text-center text-[18px] font-semibold"
              style={{ color: C.text1 }}
            >
              {t('noMoreFree', lang)}
            </DialogTitle>
            <DialogDescription
              className="text-center mt-2 text-[14px] font-light"
              style={{ color: C.text2, lineHeight: 1.5 }}
            >
              {t('shareToUnlock', lang)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {/* Usage stats */}
            <div className="flex items-center justify-center gap-10">
              <div className="text-center">
                <p className="text-[32px] font-bold tabular-nums" style={{ color: C.accent }}>{usage.evaluateCount}/{usage.evalLimit}</p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: C.text3 }}>{t('ratings', lang)}</p>
              </div>
              <div className="w-px h-12" style={{ background: C.separator }} />
              <div className="text-center">
                <p className="text-[32px] font-bold tabular-nums" style={{ color: C.accent }}>{usage.generateCount}/{usage.genLimit}</p>
                <p className="text-[11px] mt-1 font-medium" style={{ color: C.text3 }}>{t('generations', lang)}</p>
              </div>
            </div>

            {/* Bonus info cards — iOS grouped style */}
            <div className="rounded-[16px] overflow-hidden" style={{ background: C.cardElevated }}>
              <div className="flex items-center gap-3.5 px-4 py-3.5" style={{ borderBottom: `0.5px solid ${C.separator}` }}>
                <span className="text-[18px]">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: C.text1 }}>{t('streakTitle', lang)}</p>
                  <p className="text-[12px] font-light" style={{ color: C.text3 }}>{t('streakDesc', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold" style={{ color: C.accent }}>{usage.streak}{lang === 'zh' ? '天' : 'd'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="text-[18px]">📢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: C.text1 }}>{t('shareBonusTitle', lang)}</p>
                  <p className="text-[12px] font-light" style={{ color: C.text3 }}>{t('shareBonusInfo', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-bold" style={{ color: C.accent }}>+{usage.shareCount * 2}</p>
                </div>
              </div>
            </div>

            {/* Share button */}
            <Button
              onClick={handleShare}
              className="w-full font-semibold rounded-[14px] h-[52px] text-[16px] border-0"
              style={{ background: C.accent, color: '#000' }}
            >
              <Share2 className="w-[17px] h-[17px] mr-2" /> {t('shareButton', lang)}
            </Button>

            <CountdownTimer seconds={usage.secondsUntilReset} lang={lang} C={C} />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowPaywall(false)}
              className="mx-auto text-[14px] font-medium"
              style={{ color: C.text2 }}
            >
              {t('gotIt', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ User Manual Dialog — Premium Apple ═══════ */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent
          className="max-w-sm rounded-[24px]"
          style={{ background: C.card, border: 'none', boxShadow: C.shadowLg }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-center text-[18px] font-semibold"
              style={{ color: C.text1 }}
            >
              📖 {t('manualTitle', lang)}
            </DialogTitle>
          </DialogHeader>
          <div
            className="max-h-[65vh] overflow-y-auto space-y-2.5 pr-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.separator} transparent` }}
          >
            {([
              { titleKey: 'manualAboutTitle' as const, contentKey: 'manualAboutContent' as const },
              { titleKey: 'manualRateTitle' as const, contentKey: 'manualRateContent' as const },
              { titleKey: 'manualGenTitle' as const, contentKey: 'manualGenContent' as const },
              { titleKey: 'manualBaziTitle' as const, contentKey: 'manualBaziContent' as const },
              { titleKey: 'manualScoreTitle' as const, contentKey: 'manualScoreContent' as const },
              { titleKey: 'manualResultTitle' as const, contentKey: 'manualResultContent' as const },
              { titleKey: 'manualUsageTitle' as const, contentKey: 'manualUsageContent' as const },
              { titleKey: 'manualLangTitle' as const, contentKey: 'manualLangContent' as const },
            ]).map((section, i) => (
              <div
                key={i}
                className="rounded-[16px] p-4"
                style={{ background: C.cardElevated }}
              >
                <h4 className="text-[13px] font-semibold mb-2" style={{ color: C.accent }}>{t(section.titleKey, lang)}</h4>
                <div className="text-[12px] leading-[1.7] whitespace-pre-line font-light" style={{ color: `${C.text1}BB` }}>
                  {t(section.contentKey, lang)}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowManual(false)}
              className="w-full font-semibold rounded-[14px] h-[52px] text-[16px] border-0"
              style={{ background: C.accent, color: '#000' }}
            >
              {t('manualClose', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== COUNTDOWN TIMER — Apple Activity Rings style ===================

function CountdownTimer({ seconds, lang, C }: { seconds: number; lang: Lang; C: ThemeColors }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (seconds <= 0) return
    let current = seconds
    const timer = setInterval(() => {
      current -= 1
      if (current <= 0) { clearInterval(timer); setRemaining(0); return }
      setRemaining(current)
    }, 1000)
    return () => clearInterval(timer)
  }, [seconds])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="text-center">
      <p className="text-[11px] mb-2 font-medium" style={{ color: C.text3 }}>{t('resetIn', lang)}</p>
      <div className="flex items-center justify-center gap-2.5">
        {[
          { val: pad(h), unit: t('hours', lang) },
          { val: pad(m), unit: t('minutes', lang) },
          { val: pad(s), unit: t('seconds', lang) },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="rounded-[10px] px-3 py-2 min-w-[40px] text-center"
              style={{ background: C.cardElevated }}
            >
              <span
                className="text-[14px] font-mono font-semibold tabular-nums"
                style={{ color: C.text2 }}
              >
                {item.val}
              </span>
            </div>
            <span className="text-[9px] font-medium" style={{ color: C.text3 }}>{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =================== FORTUNE CARD — Premium Apple ===================

function FortuneCard({ emoji, title, content, highlight, lang, C }: {
  emoji: string; title: string; content: string; highlight?: boolean; lang: Lang; C: ThemeColors
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
    >
      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          background: C.card,
          boxShadow: highlight
            ? `${C.shadow}, inset 0 0 0 0.5px ${C.accent}18`
            : C.shadow,
        }}
      >
        {/* Card header */}
        <div className="px-5 pt-5 pb-1.5 flex items-center gap-2.5">
          <span className="text-[18px]">{emoji}</span>
          <h3
            className="text-[12px] font-semibold tracking-[0.04em]"
            style={{ color: highlight ? C.accent : C.text2 }}
          >
            {title}
          </h3>
        </div>
        {/* Content */}
        <div className="px-5 pb-5">
          <div
            className="text-[14px] leading-[1.75] prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed font-light"
            style={{ color: `${C.text1}CC` }}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =================== EVAL RESULT CARD — Premium Apple ===================

function EvalResultCard({ result, lang, C }: { result: any; lang: Lang; C: ThemeColors }) {
  const score = result.overallScore || 0
  const verdict = getScoreVerdict(score, lang)

  const metrics = [
    { label: t('scoreBazi', lang), value: result.yiXueScore, emoji: '⚡' },
    { label: t('scoreSpread', lang), value: result.influencerLevel, emoji: '🚀' },
    { label: t('scorePopularity', lang), value: result.acceptanceLevel, emoji: '💛' },
  ]

  const sections = [
    { emoji: '👀', title: t('nameInterpretation', lang), content: result.nameInterpretation },
    { emoji: '💣', title: t('redFlagCheck', lang), content: result.ambiguityCheck },
    { emoji: '🌐', title: t('onlinePresence', lang), content: result.onlineUsageAnalysis },
    { emoji: '🔥', title: t('viralPotential', lang), content: result.viralPotential, highlight: true },
    { emoji: '💡', title: t('renameSuggestions', lang), content: result.renameSuggestions },
  ]

  // Score color gradient based on value
  const scoreColor = score >= 75 ? C.accent : score >= 55 ? '#D4A84A' : score >= 35 ? '#A0784A' : '#8A5A4A'

  // Ring dimensions
  const RING_SIZE = 140
  const RING_RADIUS = 62
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

  return (
    <div className="space-y-4">
      {/* ══ Score Header — Apple Ring Chart ══ */}
      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{ background: C.card, boxShadow: C.shadowMd }}
      >
        <div className="relative pt-12 pb-10 text-center">
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: EASE_OUT }}
            className="text-[11px] font-semibold tracking-[0.18em] uppercase mb-6"
            style={{ color: C.text3 }}
          >
            {t('fortuneCard', lang)}
          </motion.p>

          {/* Score + Apple Activity Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 140, damping: 18 }}
            className="relative inline-flex items-center justify-center"
          >
            {/* SVG Ring */}
            <svg
              className="absolute"
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            >
              {/* Background ring */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={C.separator}
                strokeWidth="3"
                opacity="0.4"
              />
              {/* Progress ring */}
              <motion.circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={scoreColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - score / 100)}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - score / 100) }}
                transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            {/* Score number */}
            <motion.span
              className="text-[64px] font-bold tabular-nums relative z-10"
              style={{ color: C.text1, letterSpacing: '-0.03em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {score}
            </motion.span>
          </motion.div>

          {/* Sub label */}
          <p
            className="text-[10px] tracking-[0.22em] font-medium mt-2 uppercase"
            style={{ color: C.text3 }}
          >
            {t('overall', lang)}
          </p>

          {/* Verdict — Apple pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 220, damping: 22 }}
            className="mt-6 flex flex-col items-center gap-2.5"
          >
            <span
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-semibold tracking-[0.02em]"
              style={{ background: C.accentDim, color: C.accent }}
            >
              {verdict}
            </span>
            {/* Deterministic badge */}
            <span
              className="text-[10px] font-medium tracking-[0.04em]"
              style={{ color: C.text3 }}
            >
              🔒 {t('deterministicNote', lang)}
            </span>
          </motion.div>
        </div>
      </div>

      {/* ══ Summary Quote — Apple typography ══ */}
      {result.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5, ease: EASE_OUT }}
          className="relative px-6 py-6 text-center rounded-[20px]"
          style={{ background: C.card, boxShadow: C.shadow }}
        >
          <span
            className="absolute top-1 left-4 text-5xl font-serif leading-none select-none"
            style={{ color: `${C.accent}10` }}
          >
            &ldquo;
          </span>
          <p
            className="text-[15px] leading-[1.75] font-light"
            style={{ color: `${C.text1}AA` }}
          >
            {result.summary}
          </p>
          <span
            className="absolute bottom-1 right-4 text-5xl font-serif leading-none select-none"
            style={{ color: `${C.accent}10` }}
          >
            &rdquo;
          </span>
        </motion.div>
      )}

      {/* ══ Metric Bars — Apple Health style ══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5, ease: EASE_OUT }}
        className="rounded-[20px] p-5"
        style={{ background: C.card, boxShadow: C.shadow }}
      >
        {metrics.map((m, i) => (
          <div key={m.label} className={i < metrics.length - 1 ? 'mb-5' : ''}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px]">{m.emoji}</span>
                <span className="text-[13px] font-medium" style={{ color: C.text2 }}>{m.label}</span>
              </div>
              <span className="text-[14px] font-semibold tabular-nums" style={{ color: C.text1 }}>{m.value}</span>
            </div>
            <div
              className="h-[4px] w-full overflow-hidden rounded-full"
              style={{ background: C.cardElevated }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${C.accent}30, ${C.accent})` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(m.value, 100)}%` }}
                transition={{ duration: 1, delay: 1.0 + i * 0.12, ease: EASE_OUT }}
              />
            </div>
          </div>
        ))}
      </motion.div>

      {/* ══ Detail Sections — Fortune Cards ══ */}
      {sections.filter(s => s.content && s.content !== t('locked', lang)).map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
        >
          <FortuneCard
            emoji={section.emoji}
            title={section.title}
            content={section.content}
            highlight={section.highlight}
            lang={lang}
            C={C}
          />
        </motion.div>
      ))}

      {/* Bottom spacer for sticky share bar */}
      <div className="h-24" />
    </div>
  )
}

// =================== GEN RESULT CARD — Premium Apple ===================

function GenResultCard({ result, onNameSelect, lang, C }: { result: any; onNameSelect: (name: string) => void; lang: Lang; C: ThemeColors }) {
  const [confirmingName, setConfirmingName] = useState<string | null>(null)

  const handleSelect = (name: string) => {
    if (confirmingName === name) { onNameSelect(name); setConfirmingName(null) }
    else { setConfirmingName(name); setTimeout(() => setConfirmingName(prev => prev === name ? null : prev), 3000) }
  }

  return (
    <div className="space-y-4">
      {/* Yi Xue Analysis */}
      {result.yiXueAnalysis && (
        <FortuneCard emoji="🔮" title={t('yiXueAnalysis', lang)} content={result.yiXueAnalysis} lang={lang} C={C} />
      )}

      {/* Suggested Industries */}
      {result.suggestedIndustries && (
        <FortuneCard emoji="💼" title={t('suggestedIndustries', lang)} content={result.suggestedIndustries} lang={lang} C={C} />
      )}

      {/* ══ Name Cards — iOS Settings grouped list style ══ */}
      {result.names?.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px]">🏆</span>
            <span className="text-[16px] font-semibold" style={{ color: C.text1 }}>{t('top5Picks', lang)}</span>
          </div>
          <div className="space-y-2.5">
            {result.names.map((nameItem: any, index: number) => {
              const isConfirming = confirmingName === nameItem.name
              const rank = index + 1
              const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''

              return (
                <motion.div
                  key={nameItem.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.45, ease: EASE_OUT }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(nameItem.name)}
                  className="cursor-pointer"
                >
                  <Card
                    className="rounded-[20px] transition-all duration-200 overflow-hidden"
                    style={{
                      background: C.card,
                      border: 'none',
                      boxShadow: isConfirming
                        ? `${C.shadow}, inset 0 0 0 1px ${C.accent}30`
                        : C.shadow,
                    }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3.5">
                        {/* Rank badge */}
                        <div
                          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                          style={{ background: C.accentDim }}
                        >
                          {rankEmoji
                            ? <span className="text-[14px]">{rankEmoji}</span>
                            : <span className="font-bold text-[12px]" style={{ color: `${C.accent}80` }}>{rank}</span>
                          }
                        </div>
                        {/* Name + Reason */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[16px]" style={{ color: C.text1 }}>{nameItem.name}</p>
                          <p className="text-[12px] mt-1 line-clamp-2 font-light" style={{ color: C.text3, lineHeight: 1.5 }}>{nameItem.reason}</p>
                        </div>
                        {/* Score + Style */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            className="border-0 text-[11px] font-bold rounded-[8px] px-2.5 py-1"
                            style={{
                              background: nameItem.score >= 80 ? `${C.accent}18` : C.accentDim,
                              color: nameItem.score >= 80 ? C.accent : `${C.accent}88`,
                            }}
                          >
                            {nameItem.score}{t('score', lang)}
                          </Badge>
                          <span className="text-[10px] font-medium" style={{ color: C.text3 }}>{nameItem.style}</span>
                        </div>
                      </div>
                      {isConfirming && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 text-center text-[13px] font-medium"
                          style={{ color: C.accent }}
                        >
                          {t('confirmSelect', lang)}
                        </motion.div>
                      )}
                      {!isConfirming && (
                        <div className="mt-2.5 text-center text-[11px] font-light" style={{ color: C.text3 }}>{t('clickToSelect', lang)}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
