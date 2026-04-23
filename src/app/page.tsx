'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

// Year range for date picker — dynamic to include current year
const YEAR_MIN = 1940
const YEAR_MAX = new Date().getFullYear()
const YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i) // newest first
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// v1.0.3 — Ultra-clean palette: black + gold only
const C = {
  bg: '#0A0A0E',
  card: '#111116',
  border: '#1C1C24',
  accent: '#C9A96E',
  accentDim: 'rgba(201,169,110,0.12)',
  accentGlow: 'rgba(201,169,110,0.06)',
  text1: '#EEEEEE',
  text2: 'rgba(238,238,238,0.50)',
  text3: 'rgba(238,238,238,0.18)',
}

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

  // Form state — year/month/day for efficient date picker
  // Initialize with today's date on client (avoid hydration mismatch with static defaults)
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

  // Computed birth date string
  const birthDate = useMemo(() => {
    const m = String(birthMonth).padStart(2, '0')
    const d = String(birthDay).padStart(2, '0')
    return `${birthYear}-${m}-${d}`
  }, [birthYear, birthMonth, birthDay])

  // Days in current month for day selector
  const daysInMonth = useMemo(() => getDaysInMonth(birthYear, birthMonth), [birthYear, birthMonth])

  // Adjust day if it exceeds days in month
  useEffect(() => {
    if (birthDay > daysInMonth) setBirthDay(daysInMonth)
  }, [daysInMonth, birthDay])

  useEffect(() => {
    setFingerprint(getOrCreateFingerprint())
    setLang(getInitialLang())
    // Set birth date to today's date on client mount
    const now = new Date()
    setBirthYear(now.getFullYear())
    setBirthMonth(now.getMonth() + 1)
    setBirthDay(now.getDate())
  }, [])
  useEffect(() => { if (fingerprint) fetchUsage() }, [fingerprint])

  // Auto-calculate bazi when birth info changes
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
    const text = t('shareText', lang, { score })
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: 'NameVibe', text, url }) } catch {}
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

  // Platform label helper
  const platformLabel = (p: typeof PLATFORMS[0]) => lang === 'zh' ? p.labelZh : p.labelEn

  // =================== RENDER ===================

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: C.bg }}>
      {/* Header — Minimal sticky */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: `${C.bg}ee`, borderColor: C.border }}>
        <div className="max-w-[460px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-v5.png" alt="名鉴" width={32} height={32} className="rounded-lg" priority />
            <span className="font-bold text-sm tracking-tight" style={{ color: C.text1 }}>{t('appName', lang)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowManual(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all active:scale-95"
              style={{ background: C.card, borderColor: C.border, color: C.text2 }}
              title={t('manualTitle', lang)}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all active:scale-95 min-h-[34px]"
              style={{ background: C.card, borderColor: C.border, color: C.text2 }}
              title={lang === 'zh' ? 'Switch to English' : '切换中文'}
            >
              <Languages className="w-3 h-3" />
              <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[460px] mx-auto px-4 py-3 sm:py-4">
          <AnimatePresence mode="wait">
            {/* HOME VIEW */}
            {(view === 'home') && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Hero */}
                <div className="text-center mb-4">
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <h1 className="text-2xl font-extrabold tracking-tight leading-tight" style={{ color: C.text1 }}>
                      {t('heroTitle1', lang)}
                      <span style={{ color: C.accent }}> {t('heroTitle2', lang)}</span>
                    </h1>
                    <p className="text-[11px] mt-1" style={{ color: C.text3 }}>{t('heroSub', lang)}</p>
                  </motion.div>

                  {/* Mode Toggle */}
                  <motion.div className="mt-3 flex rounded-xl p-0.5 gap-0.5 border" style={{ background: C.card, borderColor: C.border }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <button
                      onClick={() => setMode('evaluate')}
                      className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                        mode === 'evaluate' ? 'text-black' : ''
                      }`}
                      style={mode === 'evaluate' ? { background: C.accent } : { color: C.text3 }}
                    >
                      <Star className="w-3.5 h-3.5" /> {t('rateMyName', lang)}
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                        mode === 'generate' ? 'text-black' : ''
                      }`}
                      style={mode === 'generate' ? { background: C.accent } : { color: C.text3 }}
                    >
                      <Zap className="w-3.5 h-3.5" /> {t('generateName', lang)}
                    </button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="rounded-2xl overflow-hidden" style={{ background: C.card, borderColor: C.border }}>
                    <CardContent className="p-4 space-y-3.5">
                      {/* Name Input (evaluate mode only) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-1">
                          <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('onlineName', lang)} *</Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder={t('onlineNamePlaceholder', lang)}
                            className="h-11 rounded-xl text-sm placeholder:text-white/12 focus-visible:ring-0"
                            style={{ background: C.bg, borderColor: C.border, color: C.text1 }}
                          />
                          {nameError && <p className="text-[11px]" style={{ color: C.accent }}>{nameError}</p>}
                        </div>
                      )}

                      {/* Birth Date — Efficient 3-Select Picker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('birthDate', lang)}</Label>
                          {/* Calendar type toggle */}
                          <div className="flex rounded-lg p-0.5 border" style={{ background: C.bg, borderColor: C.border }}>
                            <button
                              onClick={() => setCalendarType('solar')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all`}
                              style={calendarType === 'solar'
                                ? { background: C.accentDim, color: C.accent }
                                : { color: C.text3 }
                              }
                            >
                              {t('calendarSolar', lang)}
                            </button>
                            <button
                              onClick={() => setCalendarType('lunar')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all`}
                              style={calendarType === 'lunar'
                                ? { background: C.accentDim, color: C.accent }
                                : { color: C.text3 }
                              }
                            >
                              {t('calendarLunar', lang)}
                            </button>
                          </div>
                        </div>

                        {/* 3-Column Date Selector — Year / Month / Day */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Year */}
                          <Select value={String(birthYear)} onValueChange={(v) => setBirthYear(Number(v))}>
                            <SelectTrigger className="h-11 rounded-xl text-sm" style={{ background: C.bg, borderColor: C.border, color: C.text1 }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-48" style={{ background: C.card, borderColor: C.border }}>
                              {YEARS.map(y => (
                                <SelectItem key={y} value={String(y)} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Month */}
                          <Select value={String(birthMonth)} onValueChange={(v) => setBirthMonth(Number(v))}>
                            <SelectTrigger className="h-11 rounded-xl text-sm" style={{ background: C.bg, borderColor: C.border, color: C.text1 }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-48" style={{ background: C.card, borderColor: C.border }}>
                              {MONTHS.map(m => (
                                <SelectItem key={m} value={String(m)} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{m}{lang === 'zh' ? '月' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* Day */}
                          <Select value={String(birthDay)} onValueChange={(v) => setBirthDay(Number(v))}>
                            <SelectTrigger className="h-11 rounded-xl text-sm" style={{ background: C.bg, borderColor: C.border, color: C.text1 }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-48" style={{ background: C.card, borderColor: C.border }}>
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                                <SelectItem key={d} value={String(d)} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{d}{lang === 'zh' ? '日' : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Birth time (optional) — compact inline */}
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] shrink-0" style={{ color: C.text3 }}>{t('birthTime', lang)}</Label>
                          <Input
                            type="time"
                            value={birthTime}
                            onChange={(e) => setBirthTime(e.target.value)}
                            className="h-8 rounded-lg [color-scheme:dark] text-xs flex-1"
                            style={{ background: C.bg, borderColor: C.border, color: C.text1 }}
                          />
                        </div>
                      </div>

                      {/* Auto Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                          <div className="rounded-xl p-3" style={{ background: C.accentGlow, border: `1px solid ${C.accent}18` }}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[10px] font-bold tracking-wider" style={{ color: `${C.accent}A0` }}>{t('autoBazi', lang)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              {[
                                { label: t('year', lang), val: baziData.yearPillar },
                                { label: t('month', lang), val: baziData.monthPillar },
                                { label: t('day', lang), val: baziData.dayPillar },
                                { label: t('hour', lang), val: baziData.hourPillar },
                              ].map(p => (
                                <div key={p.label} className="rounded-lg py-1.5" style={{ background: C.bg }}>
                                  <div className="font-bold text-sm" style={{ color: C.text1 }}>{p.val}</div>
                                  <div className="text-[9px]" style={{ color: C.text3 }}>{p.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: C.text3 }}>
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && (
                                <span style={{ color: `${C.accent}70` }}>{t('missing', lang)}{baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.text3 }}>
                          <Loader2 className="w-3 h-3 animate-spin" /> {t('calculatingBazi', lang)}
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('birthPlace', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span></Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder={t('birthPlacePlaceholder', lang)}
                          className="h-11 rounded-xl text-sm placeholder:text-white/12 focus-visible:ring-0"
                          style={{ background: C.bg, borderColor: C.border, color: C.text1 }}
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('mainPlatform', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="h-11 rounded-xl text-sm" style={{ background: C.bg, borderColor: C.border, color: C.text1 }}>
                            <SelectValue placeholder={t('selectPlatform', lang)} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-56" style={{ background: C.card, borderColor: C.border }}>
                            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.text3 }}>{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: C.text3 }}>{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-sm focus:bg-white/5 focus:text-white" style={{ color: C.text2 }}>{platformLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('specialRequirements', lang)} <span style={{ color: C.text3 }}>({t('optional', lang)})</span></Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder={t('specialRequirementsPlaceholder', lang)}
                              className="min-h-[64px] rounded-xl text-sm placeholder:text-white/12 focus-visible:ring-0"
                              style={{ background: C.bg, borderColor: C.border, color: C.text1 }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium" style={{ color: C.text2 }}>{t('lockWords', lang)} <span style={{ color: C.text3 }}>({t('lockWordsHint', lang)})</span></Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder={t('lockWordsPlaceholder', lang)}
                              className="h-11 rounded-xl text-sm placeholder:text-white/12 focus-visible:ring-0"
                              style={{ background: C.bg, borderColor: C.border, color: C.text1 }}
                            />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <Button
                        onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate}
                        disabled={isLoading || (mode === 'evaluate' && usage.evaluateUsed) || (mode === 'generate' && usage.generateUsed)}
                        className="w-full h-12 text-base font-bold rounded-xl transition-all active:scale-[0.98]"
                        style={{ background: C.accent, color: '#000' }}
                      >
                        <span className="flex items-center gap-2">
                          {mode === 'evaluate' ? <><Star className="w-4 h-4" /> {t('analyzeVibe', lang)}</> : <><Zap className="w-4 h-4" /> {t('generateNames', lang)}</>}
                        </span>
                      </Button>

                      {/* Usage indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-3 text-[11px]" style={{ color: C.text3 }}>
                          <span>{t('rating', lang)}: {Math.max(0, usage.evalLimit - usage.evaluateCount)}/{usage.evalLimit}</span>
                          <span>·</span>
                          <span>{t('generation', lang)}: {Math.max(0, usage.genLimit - usage.generateCount)}/{usage.genLimit}</span>
                        </div>
                        {(usage.streak > 0 || usage.shareCount > 0) && (
                          <div className="flex items-center justify-center gap-2 text-[10px]">
                            {usage.streak > 0 && (
                              <span style={{ color: `${C.accent}60` }}>🔥 {usage.streak}{t('streakDays', lang)} (+{usage.streakBonus})</span>
                            )}
                            {usage.streak > 0 && usage.shareCount > 0 && <span style={{ color: C.text3 }}>·</span>}
                            {usage.shareCount > 0 && (
                              <span style={{ color: `${C.accent}60` }}>📢 +{usage.shareCount * 2}</span>
                            )}
                          </div>
                        )}
                        <div className="text-center text-[10px]" style={{ color: `${C.text3}88` }}>
                          {t('dailyReset', lang)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* LOADING OVERLAY */}
            {(view === 'evaluating' || view === 'generating') && isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: `${C.bg}EE` }}>
                <div className="flex flex-col items-center gap-5">
                  <div className="relative w-20 h-20">
                    <motion.div className="absolute inset-0 rounded-full border-2" style={{ borderColor: `${C.accent}18` }} animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-2 rounded-full border-2 border-r-transparent border-b-transparent border-l-transparent" style={{ borderTopColor: C.accent }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-4 rounded-full border-2 border-t-transparent border-l-transparent" style={{ borderRightColor: `${C.accent}70`, borderBottomColor: `${C.accent}70` }} animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                    <div className="absolute inset-6 rounded-full flex items-center justify-center" style={{ background: C.bg }}>
                      <span className="text-lg">{view === 'evaluating' ? '🔮' : '✨'}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: C.text1 }}>
                      {view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: C.text3 }}>
                      {view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EVAL RESULT */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]" style={{ color: C.text3 }}>
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <EvalResultCard result={evalResult} lang={lang} />
              </motion.div>
            )}

            {/* GEN RESULT */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]" style={{ color: C.text3 }}>
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} lang={lang} />
              </motion.div>
            )}

            {/* GEN EVAL RESULT */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]" style={{ color: C.text3 }}>
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                {selectedName && (
                  <div className="text-center mb-4">
                    <p className="text-xs" style={{ color: C.text3 }}>{t('selectedName', lang)}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: C.accent }}>{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
                    <p className="text-sm" style={{ color: C.text3 }}>{t('evaluatingSelected', lang)}</p>
                  </div>
                ) : evalResult && <EvalResultCard result={evalResult} lang={lang} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sticky Share Bar — Result Views */}
      <AnimatePresence>
        {(view === 'eval-result' || view === 'gen-eval-result') && evalResult && (
          <motion.div
            key="share-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 1.2 }}
            className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t"
            style={{ background: `${C.bg}F5`, borderColor: `${C.accent}20`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="max-w-[460px] mx-auto px-4 py-3">
              <Button
                onClick={handleShare}
                className="w-full h-12 font-bold rounded-xl active:scale-[0.97] transition-all"
                style={{ background: C.accent, color: '#000' }}
              >
                <motion.span
                  className="flex items-center gap-2"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Share2 className="w-4 h-4" /> {t('shareMyScore', lang)}
                </motion.span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - sticky to bottom */}
      <footer className="mt-auto border-t" style={{ borderColor: C.border, background: C.bg }}>
        <div className="max-w-[460px] mx-auto px-4 py-3 flex flex-col items-center gap-1" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-1.5">
            <Image src="/logo-v5.png" alt="" width={12} height={12} className="rounded opacity-30" />
            <span className="text-[11px]" style={{ color: `${C.text3}88` }}>{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-[10px]" style={{ color: `${C.text3}55` }}>{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* Paywall */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: C.card, borderColor: C.border }}>
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: C.accentDim }}>
                <Lock className="w-5 h-5" style={{ color: C.accent }} />
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-bold" style={{ color: C.text1 }}>{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center mt-1 text-sm" style={{ color: C.text2 }}>{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Usage stats */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold" style={{ color: C.accent }}>{usage.evaluateCount}/{usage.evalLimit}</p><p className="text-[10px]" style={{ color: C.text3 }}>{t('ratings', lang)}</p></div>
              <div className="w-px h-8" style={{ background: C.border }} />
              <div className="text-center"><p className="text-2xl font-bold" style={{ color: C.accent }}>{usage.generateCount}/{usage.genLimit}</p><p className="text-[10px]" style={{ color: C.text3 }}>{t('generations', lang)}</p></div>
            </div>

            {/* Bonus info cards */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: C.bg, borderColor: C.border }}>
                <span className="text-sm">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: C.text2 }}>{t('streakTitle', lang)}</p>
                  <p className="text-[10px]" style={{ color: C.text3 }}>{t('streakDesc', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: C.accent }}>{usage.streak}{lang === 'zh' ? '天' : 'd'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ background: C.bg, borderColor: C.border }}>
                <span className="text-sm">📢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: C.text2 }}>{t('shareBonusTitle', lang)}</p>
                  <p className="text-[10px]" style={{ color: C.text3 }}>{t('shareBonusInfo', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: C.accent }}>+{usage.shareCount * 2}</p>
                </div>
              </div>
            </div>

            {/* Share button */}
            <Button onClick={handleShare} className="w-full font-semibold rounded-xl h-12" style={{ background: C.accent, color: '#000' }}>
              <Share2 className="w-4 h-4 mr-1.5" /> {t('shareButton', lang)}
            </Button>

            {/* Countdown */}
            <CountdownTimer seconds={usage.secondsUntilReset} lang={lang} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaywall(false)} className="mx-auto text-sm" style={{ color: C.text3 }}>{t('gotIt', lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Manual Dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm rounded-2xl" style={{ background: C.card, borderColor: C.border }}>
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold" style={{ color: C.text1 }}>
              📖 {t('manualTitle', lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.accent}30 transparent` }}>
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
              <div key={i} className="rounded-xl p-3" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                <h4 className="text-[13px] font-bold mb-1.5" style={{ color: C.accent }}>{t(section.titleKey, lang)}</h4>
                <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: `${C.text1}AA` }}>
                  {t(section.contentKey, lang)}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowManual(false)} className="w-full font-semibold rounded-xl h-11" style={{ background: C.accent, color: '#000' }}>
              {t('manualClose', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== COUNTDOWN TIMER ===================

function CountdownTimer({ seconds, lang }: { seconds: number; lang: Lang }) {
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
      <p className="text-[10px] mb-1" style={{ color: `${C.text3}66` }}>{t('resetIn', lang)}</p>
      <div className="flex items-center justify-center gap-1.5">
        {[
          { val: pad(h), unit: t('hours', lang) },
          { val: pad(m), unit: t('minutes', lang) },
          { val: pad(s), unit: t('seconds', lang) },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="rounded-lg px-2 py-1 min-w-[32px] text-center border" style={{ background: C.bg, borderColor: C.border }}>
              <span className="text-xs font-mono font-bold" style={{ color: C.text2 }}>{item.val}</span>
            </div>
            <span className="text-[8px]" style={{ color: `${C.text3}44` }}>{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =================== FORTUNE CARD — Image-Text Oracle ===================
// v1.0.3: Clean black+gold style, emoji header, markdown content

function FortuneCard({ emoji, title, content, highlight, lang }: {
  emoji: string; title: string; content: string; highlight?: boolean; lang: Lang
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="rounded-2xl overflow-hidden" style={{
        background: C.card,
        border: `1px solid ${highlight ? `${C.accent}30` : C.border}`,
        borderLeftWidth: 3,
        borderLeftColor: highlight ? C.accent : `${C.accent}40`,
      }}>
        {/* Card header: emoji + title */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="text-[12px] font-bold tracking-wide" style={{ color: highlight ? C.accent : C.text2 }}>{title}</h3>
        </div>
        {/* Content */}
        <div className="px-4 pb-3">
          <div className="text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed" style={{ color: `${C.text1}BB` }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =================== EVAL RESULT CARD — Image-Text Oracle ===================

function EvalResultCard({ result, lang }: { result: any; lang: Lang }) {
  const score = result.overallScore || 0
  const verdict = getScoreVerdict(score, lang)

  const metrics = [
    { label: t('yiXue', lang), value: result.yiXueScore, emoji: '⚡' },
    { label: t('viral', lang), value: result.influencerLevel, emoji: '🚀' },
    { label: t('accept', lang), value: result.acceptanceLevel, emoji: '💛' },
  ]

  const sections = [
    { emoji: '👀', title: t('nameInterpretation', lang), content: result.nameInterpretation },
    { emoji: '💣', title: t('redFlagCheck', lang), content: result.ambiguityCheck },
    { emoji: '🌐', title: t('onlinePresence', lang), content: result.onlineUsageAnalysis },
    { emoji: '🔥', title: t('viralPotential', lang), content: result.viralPotential, highlight: true },
    { emoji: '💡', title: t('renameSuggestions', lang), content: result.renameSuggestions },
  ]

  // Score color — unified gold-based gradient
  const scoreColor = score >= 75 ? C.accent : score >= 55 ? '#D4A84A' : score >= 35 ? '#A0784A' : '#8A5A4A'
  const glowIntensity = score >= 75 ? 0.5 : score >= 55 ? 0.3 : 0.15
  const glowSize = score >= 75 ? 60 : score >= 55 ? 40 : 25

  return (
    <div className="space-y-3">
      {/* Oracle Header — Score + Verdict */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${C.accent}4D 2px, ${C.accent}4D 3px)`,
        }} />
        <div className="relative pt-8 pb-6 text-center">
          {/* Title */}
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: `${C.accent}55` }}>
            {t('fortuneCard', lang)}
          </motion.p>

          {/* Big Score */}
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
            className="relative inline-block">
            <span className="text-7xl font-black relative z-10 tabular-nums" style={{
              color: C.text1,
              textShadow: `0 0 ${glowSize}px ${scoreColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}, 0 0 ${glowSize * 2}px ${scoreColor}${Math.round(glowIntensity * 0.5 * 255).toString(16).padStart(2, '0')}`,
            }}>
              {score}
            </span>
          </motion.div>

          <p className="text-[9px] tracking-[0.3em] font-medium mt-1" style={{ color: C.text3 }}>
            {t('overall', lang)}
          </p>

          {/* Verdict Stamp */}
          <motion.div initial={{ opacity: 0, scale: 0.5, rotate: -15 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="mt-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full scale-125 blur-md" style={{ background: `${C.accent}0A` }} />
              <span className="relative inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-black tracking-wide" style={{ background: `${C.accent}12`, border: `2px solid ${C.accent}30`, color: C.accent }}>
                {verdict}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Summary Quote */}
      {result.summary && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="relative px-5 py-4 text-center rounded-2xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <span className="absolute top-1.5 left-3 text-3xl font-serif leading-none" style={{ color: `${C.accent}18` }}>&ldquo;</span>
          <p className="text-[14px] leading-relaxed font-medium" style={{ color: `${C.text1}90` }}>
            {result.summary}
          </p>
          <span className="absolute bottom-1.5 right-3 text-3xl font-serif leading-none" style={{ color: `${C.accent}18` }}>&rdquo;</span>
        </motion.div>
      )}

      {/* Metric Bars — Gold gradient fills only */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="space-y-2.5 rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        {metrics.map((m, i) => (
          <div key={m.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">{m.emoji}</span>
                <span className="text-[11px] font-medium" style={{ color: C.text2 }}>{m.label}</span>
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: C.text2 }}>{m.value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.bg }}>
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C.accent}30, ${C.accent})` }}
                initial={{ width: 0 }} animate={{ width: `${Math.min(m.value, 100)}%` }} transition={{ duration: 0.8, delay: 0.9 + i * 0.1 }} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Detail Sections — Fortune Cards */}
      {sections.filter(s => s.content && s.content !== t('locked', lang)).map((section, i) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 + i * 0.08 }}>
          <FortuneCard
            emoji={section.emoji}
            title={section.title}
            content={section.content}
            highlight={section.highlight}
            lang={lang}
          />
        </motion.div>
      ))}

      {/* Bottom spacer for sticky share bar */}
      <div className="h-20" />
    </div>
  )
}

// =================== GEN RESULT CARD ===================

function GenResultCard({ result, onNameSelect, lang }: { result: any; onNameSelect: (name: string) => void; lang: Lang }) {
  const [confirmingName, setConfirmingName] = useState<string | null>(null)

  const handleSelect = (name: string) => {
    if (confirmingName === name) { onNameSelect(name); setConfirmingName(null) }
    else { setConfirmingName(name); setTimeout(() => setConfirmingName(prev => prev === name ? null : prev), 3000) }
  }

  return (
    <div className="space-y-3">
      {/* Yi Xue Analysis */}
      {result.yiXueAnalysis && (
        <FortuneCard emoji="🔮" title={t('yiXueAnalysis', lang)} content={result.yiXueAnalysis} lang={lang} />
      )}

      {/* Suggested Industries */}
      {result.suggestedIndustries && (
        <FortuneCard emoji="💼" title={t('suggestedIndustries', lang)} content={result.suggestedIndustries} lang={lang} />
      )}

      {/* Name Cards */}
      {result.names?.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <span className="text-sm font-bold" style={{ color: C.text2 }}>{t('top5Picks', lang)}</span>
          </div>
          <div className="space-y-2">
            {result.names.map((nameItem: any, index: number) => {
              const isConfirming = confirmingName === nameItem.name
              const rank = index + 1
              const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
              // Unified gold-based border with subtle variation
              const borderAlpha = rank === 1 ? '60' : rank === 2 ? '40' : rank === 3 ? '28' : '18'

              return (
                <motion.div key={nameItem.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                  whileTap={{ scale: 0.98 }} onClick={() => handleSelect(nameItem.name)} className="cursor-pointer">
                  <Card className="rounded-2xl transition-all overflow-hidden" style={{
                    background: C.card,
                    border: `1px solid ${isConfirming ? `${C.accent}40` : C.border}`,
                    borderLeftWidth: 3,
                    borderLeftColor: `${C.accent}${borderAlpha}`,
                  }}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2.5">
                        {/* Rank */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: C.accentDim }}>
                          {rankEmoji ? <span className="text-xs">{rankEmoji}</span> : <span className="font-bold text-[10px]" style={{ color: `${C.accent}70` }}>{rank}</span>}
                        </div>
                        {/* Name + Reason */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm" style={{ color: C.text1 }}>{nameItem.name}</p>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: C.text3 }}>{nameItem.reason}</p>
                        </div>
                        {/* Score + Style */}
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <Badge className="border-0 text-[10px] font-bold" style={{
                            background: nameItem.score >= 80 ? `${C.accent}22` : `${C.accent}12`,
                            color: nameItem.score >= 80 ? C.accent : `${C.accent}88`,
                          }}>
                            {nameItem.score}{t('score', lang)}
                          </Badge>
                          <span className="text-[9px]" style={{ color: C.text3 }}>{nameItem.style}</span>
                        </div>
                      </div>
                      {isConfirming && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-xs font-medium" style={{ color: C.accent }}>
                          {t('confirmSelect', lang)}
                        </motion.div>
                      )}
                      {!isConfirming && (
                        <div className="mt-1 text-center text-[9px]" style={{ color: `${C.text3}44` }}>{t('clickToSelect', lang)}</div>
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
