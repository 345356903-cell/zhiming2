'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, ArrowLeft, Lock, Share2,
  Star, Loader2, Languages, Calendar,
  ChevronUp, ChevronDown
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

// Quick-pick birth years for Gen Z
const QUICK_YEARS = [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010]

// Color tokens for simplified theme
const C = {
  bg: '#0A0A0A',
  card: '#111113',
  border: '#1E1E22',
  accent: '#D4A574',
  accentLight: 'rgba(212,165,116,0.12)',
  accentMid: 'rgba(212,165,116,0.25)',
  textPrimary: 'white',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.25)',
  textFaint: 'rgba(255,255,255,0.10)',
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

// ===================== SCROLL WHEEL PICKER =====================

function ScrollWheelPicker({ value, onChange, options, itemHeight = 36 }: {
  value: number
  onChange: (val: number) => void
  options: { label: string; value: number }[]
  itemHeight?: number
}) {
  const selectedIndex = options.findIndex(o => o.value === value)
  const visibleCount = 5
  const containerHeight = itemHeight * visibleCount

  // Drag state stored in refs, only commit to state on end
  const [dragOffset, setDragOffset] = useState(-1) // -1 means not dragging
  const startYRef = useRef(0)
  const startOffsetRef = useRef(0)

  // Computed offset: when not dragging, derive from selected index
  const offset = dragOffset >= 0 ? dragOffset : selectedIndex * itemHeight

  const handlePointerDown = useCallback((clientY: number) => {
    startYRef.current = clientY
    startOffsetRef.current = selectedIndex * itemHeight
    setDragOffset(startOffsetRef.current)
  }, [selectedIndex, itemHeight])

  const handlePointerMove = useCallback((clientY: number) => {
    const delta = startYRef.current - clientY
    const newOffset = Math.max(0, Math.min((options.length - 1) * itemHeight, startOffsetRef.current + delta))
    setDragOffset(newOffset)
  }, [options.length, itemHeight])

  const handlePointerUp = useCallback(() => {
    const nearestIndex = Math.round(dragOffset / itemHeight)
    const clampedIndex = Math.max(0, Math.min(options.length - 1, nearestIndex))
    setDragOffset(-1) // exit drag mode
    if (options[clampedIndex]?.value !== value) {
      onChange(options[clampedIndex].value)
    }
  }, [dragOffset, itemHeight, options, value, onChange])

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => handlePointerDown(e.touches[0].clientY), [handlePointerDown])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    handlePointerMove(e.touches[0].clientY)
  }, [handlePointerMove])
  const onTouchEnd = useCallback(() => handlePointerUp(), [handlePointerUp])

  // Mouse events via effect
  const [mouseActive, setMouseActive] = useState(false)
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handlePointerDown(e.clientY)
    setMouseActive(true)
  }, [handlePointerDown])

  useEffect(() => {
    if (!mouseActive) return
    const onMove = (e: MouseEvent) => handlePointerMove(e.clientY)
    const onUp = () => { handlePointerUp(); setMouseActive(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [mouseActive, handlePointerMove, handlePointerUp])

  const isDragging = dragOffset >= 0

  // Button controls
  const increment = useCallback(() => {
    const idx = Math.min(options.length - 1, selectedIndex + 1)
    onChange(options[idx].value)
  }, [selectedIndex, options, onChange])

  const decrement = useCallback(() => {
    const idx = Math.max(0, selectedIndex - 1)
    onChange(options[idx].value)
  }, [selectedIndex, options, onChange])

  return (
    <div className="flex flex-col items-center" style={{ height: containerHeight + 24 }}>
      <button onClick={decrement} className="p-1 text-white/20 hover:text-white/50 active:scale-90 transition-all" type="button">
        <ChevronUp className="w-4 h-4" />
      </button>
      <div
        className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: containerHeight }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Center highlight line */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{
            top: itemHeight * 2,
            height: itemHeight,
            borderTop: `1px solid ${C.accentMid}`,
            borderBottom: `1px solid ${C.accentMid}`,
            background: C.accentLight,
            borderRadius: 8,
          }}
        />
        {/* Items */}
        <div
          className="transition-transform"
          style={{
            transform: `translateY(${itemHeight * 2 - offset}px)`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          {options.map((opt, i) => {
            const dist = Math.abs(i * itemHeight - offset) / itemHeight
            const isSelected = i === selectedIndex
            return (
              <div
                key={opt.value}
                className="flex items-center justify-center text-center font-medium"
                style={{
                  height: itemHeight,
                  opacity: Math.max(0.2, 1 - dist * 0.4),
                  transform: `scale(${Math.max(0.8, 1 - dist * 0.08)})`,
                  color: isSelected ? C.accent : 'rgba(255,255,255,0.6)',
                  fontWeight: isSelected ? 700 : 400,
                  fontSize: isSelected ? 16 : 14,
                  transition: 'color 0.2s, font-weight 0.2s',
                }}
              >
                {opt.label}
              </div>
            )
          })}
        </div>
      </div>
      <button onClick={increment} className="p-1 text-white/20 hover:text-white/50 active:scale-90 transition-all" type="button">
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  )
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

function getScoreEmoji(score: number): string {
  if (score >= 90) return '👑'
  if (score >= 75) return '🌟'
  if (score >= 55) return '😐'
  if (score >= 35) return '🫠'
  return '💀'
}

// ===================== DATE HELPERS =====================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function generateYearOptions(): { label: string; value: number }[] {
  const opts = []
  for (let y = 1980; y <= 2015; y++) {
    opts.push({ label: `${y}`, value: y })
  }
  return opts
}

function generateMonthOptions(): { label: string; value: number }[] {
  return Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
}

function generateDayOptions(maxDay: number): { label: string; value: number }[] {
  return Array.from({ length: maxDay }, (_, i) => ({ label: `${i + 1}`, value: i + 1 }))
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

  // Form state — year/month/day for scroll wheel
  const [nameInput, setNameInput] = useState('')
  const [birthYear, setBirthYear] = useState(2005)
  const [birthMonth, setBirthMonth] = useState(1)
  const [birthDay, setBirthDay] = useState(1)
  const [birthTime, setBirthTime] = useState('')
  const [calendarType, setCalendarType] = useState('solar')
  const [birthPlace, setBirthPlace] = useState('')
  const [platform, setPlatform] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [lockedWords, setLockedWords] = useState('')
  const [nameError, setNameError] = useState('')

  // Computed birthDate string
  const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`

  // Adjust day when month/year changes
  useEffect(() => {
    const maxDay = getDaysInMonth(birthYear, birthMonth)
    if (birthDay > maxDay) setBirthDay(maxDay)
  }, [birthYear, birthMonth, birthDay])

  const yearOptions = generateYearOptions()
  const monthOptions = generateMonthOptions()
  const dayOptions = generateDayOptions(getDaysInMonth(birthYear, birthMonth))

  const { baziData, loading: baziLoading, calculate: calculateBazi, reset: resetBazi } = useBazi()

  useEffect(() => { setFingerprint(getOrCreateFingerprint()); setLang(getInitialLang()) }, [])
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

  // Quick year pick handler
  const handleQuickYear = (year: number) => {
    setBirthYear(year)
    setBirthMonth(1)
    setBirthDay(1)
  }

  // =================== RENDER ===================

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0A0A0A]">
      {/* Header - Compact sticky */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1E1E22]">
        <div className="max-w-[430px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-v3.png" alt="名鉴" width={34} height={34} className="rounded-xl" priority />
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-[15px] tracking-tight">{t('appName', lang)}</span>
              <Badge variant="outline" className="border-[#D4A574]/20 text-[#D4A574]/40 text-[8px] px-1.5 py-0 h-4">v1.0.3</Badge>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#111113] border border-[#1E1E22] text-white/40 hover:text-white/60 text-xs font-medium transition-all duration-200 active:scale-95 min-h-[36px]"
            title={lang === 'zh' ? 'Switch to English' : '切换中文'}
          >
            <Languages className="w-3 h-3" />
            <span>{lang === 'zh' ? 'EN' : '中'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[430px] mx-auto px-4 py-4 sm:py-5">
          <AnimatePresence mode="wait">
            {/* HOME VIEW */}
            {(view === 'home') && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Hero */}
                <div className="text-center mb-5">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                      {t('heroTitle1', lang)}
                      <span className="text-[#D4A574]">
                        {t('heroTitle2', lang)}
                      </span>
                    </h1>
                    <p className="text-white/30 text-xs mt-1.5">{t('heroSub', lang)}</p>
                  </motion.div>

                  {/* Mode Toggle */}
                  <motion.div className="mt-4 flex bg-[#111113] rounded-full p-1 gap-0.5 border border-[#1E1E22]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <button
                      onClick={() => setMode('evaluate')}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 min-h-[44px] ${
                        mode === 'evaluate'
                          ? 'bg-[#D4A574] text-black shadow-lg shadow-[#D4A574]/20'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" /> {t('rateMyName', lang)}
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 min-h-[44px] ${
                        mode === 'generate'
                          ? 'bg-[#D4A574] text-black shadow-lg shadow-[#D4A574]/20'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" /> {t('generateName', lang)}
                    </button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="bg-[#111113] border-[#1E1E22] rounded-2xl overflow-hidden">
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Name Input (evaluate mode only) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-1.5">
                          <Label className="text-white/50 text-xs font-medium">{t('onlineName', lang)} *</Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder={t('onlineNamePlaceholder', lang)}
                            className="bg-[#0A0A0A] border-[#1E1E22] text-white placeholder:text-white/20 focus-visible:border-[#D4A574]/40 focus-visible:ring-[#D4A574]/10 h-12 rounded-xl text-sm"
                          />
                          {nameError && <p className="text-[#D4A574] text-xs">{nameError}</p>}
                        </div>
                      )}

                      {/* Birth Date - Scroll Wheel Picker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> {t('birthDate', lang)}
                          </Label>
                          {/* Calendar type toggle */}
                          <div className="flex bg-[#0A0A0A] rounded-full p-0.5 border border-[#1E1E22]">
                            <button
                              onClick={() => setCalendarType('solar')}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                                calendarType === 'solar'
                                  ? 'bg-[#D4A574]/15 text-[#D4A574]'
                                  : 'text-white/25 hover:text-white/40'
                              }`}
                            >
                              {t('calendarSolar', lang)}
                            </button>
                            <button
                              onClick={() => setCalendarType('lunar')}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
                                calendarType === 'lunar'
                                  ? 'bg-[#D4A574]/15 text-[#D4A574]'
                                  : 'text-white/25 hover:text-white/40'
                              }`}
                            >
                              {t('calendarLunar', lang)}
                            </button>
                          </div>
                        </div>

                        {/* Scroll Wheel Pickers - Year / Month / Day */}
                        <div className="flex gap-1 bg-[#0A0A0A] rounded-xl border border-[#1E1E22] p-2">
                          {/* Year */}
                          <div className="flex-1 text-center">
                            <p className="text-white/20 text-[9px] mb-0.5">{t('year', lang)}</p>
                            <ScrollWheelPicker
                              value={birthYear}
                              onChange={setBirthYear}
                              options={yearOptions}
                              itemHeight={32}
                            />
                          </div>
                          {/* Month */}
                          <div className="w-[60px] text-center">
                            <p className="text-white/20 text-[9px] mb-0.5">{t('month', lang)}</p>
                            <ScrollWheelPicker
                              value={birthMonth}
                              onChange={setBirthMonth}
                              options={monthOptions}
                              itemHeight={32}
                            />
                          </div>
                          {/* Day */}
                          <div className="w-[60px] text-center">
                            <p className="text-white/20 text-[9px] mb-0.5">{t('day', lang)}</p>
                            <ScrollWheelPicker
                              value={birthDay}
                              onChange={setBirthDay}
                              options={dayOptions}
                              itemHeight={32}
                            />
                          </div>
                        </div>

                        {/* Quick year pick */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-white/15 text-[9px] mr-0.5">{lang === 'zh' ? '快选' : 'Quick'}:</span>
                          {QUICK_YEARS.map(y => (
                            <button
                              key={y}
                              onClick={() => handleQuickYear(y)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all duration-150 active:scale-95 ${
                                birthYear === y
                                  ? 'bg-[#D4A574]/15 text-[#D4A574]'
                                  : 'bg-[#111113] text-white/20 hover:text-white/40 border border-[#1E1E22]'
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>

                        {/* Birth time (optional) */}
                        <div className="flex items-center gap-2">
                          <Label className="text-white/30 text-[10px] shrink-0">{t('birthTime', lang)}</Label>
                          <Input
                            type="time"
                            value={birthTime}
                            onChange={(e) => setBirthTime(e.target.value)}
                            className="bg-[#0A0A0A] border-[#1E1E22] text-white focus-visible:border-[#D4A574]/40 h-9 rounded-lg [color-scheme:dark] text-xs flex-1"
                          />
                        </div>
                      </div>

                      {/* Auto Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                          <div className="bg-[#D4A574]/[0.04] border border-[#D4A574]/10 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[#D4A574]/70 text-[10px] font-bold tracking-wider">{t('autoBazi', lang)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              {[
                                { label: t('year', lang), val: baziData.yearPillar },
                                { label: t('month', lang), val: baziData.monthPillar },
                                { label: t('day', lang), val: baziData.dayPillar },
                                { label: t('hour', lang), val: baziData.hourPillar },
                              ].map(p => (
                                <div key={p.label} className="bg-[#0A0A0A] rounded-lg py-1.5">
                                  <div className="text-white font-bold text-sm">{p.val}</div>
                                  <div className="text-white/20 text-[9px]">{p.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/20">
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && (
                                <span className="text-[#D4A574]/50">{t('missing', lang)}{baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-1.5 text-white/20 text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> {t('calculatingBazi', lang)}
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-1.5">
                        <Label className="text-white/50 text-xs font-medium">{t('birthPlace', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder={t('birthPlacePlaceholder', lang)}
                          className="bg-[#0A0A0A] border-[#1E1E22] text-white placeholder:text-white/20 focus-visible:border-[#D4A574]/40 focus-visible:ring-[#D4A574]/10 h-12 rounded-xl text-sm"
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-1.5">
                        <Label className="text-white/50 text-xs font-medium">{t('mainPlatform', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="bg-[#0A0A0A] border-[#1E1E22] text-white h-12 rounded-xl text-sm">
                            <SelectValue placeholder={t('selectPlatform', lang)} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111113] border-[#1E1E22] rounded-xl max-h-56">
                            <div className="px-2 py-1 text-[10px] text-white/20 font-semibold uppercase tracking-wider">{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/60 focus:bg-[#1E1E22] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                            <div className="px-2 py-1 text-[10px] text-white/20 font-semibold uppercase tracking-wider mt-1">{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/60 focus:bg-[#1E1E22] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/60 focus:bg-[#1E1E22] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-white/50 text-xs font-medium">{t('specialRequirements', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder={t('specialRequirementsPlaceholder', lang)}
                              className="bg-[#0A0A0A] border-[#1E1E22] text-white placeholder:text-white/20 focus-visible:border-[#D4A574]/40 focus-visible:ring-[#D4A574]/10 min-h-[72px] rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/50 text-xs font-medium">{t('lockWords', lang)} <span className="text-white/20">({t('lockWordsHint', lang)})</span></Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder={t('lockWordsPlaceholder', lang)}
                              className="bg-[#0A0A0A] border-[#1E1E22] text-white placeholder:text-white/20 focus-visible:border-[#D4A574]/40 focus-visible:ring-[#D4A574]/10 h-12 rounded-xl text-sm"
                            />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <Button
                        onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate}
                        disabled={isLoading || (mode === 'evaluate' && usage.evaluateUsed) || (mode === 'generate' && usage.generateUsed)}
                        className="w-full h-12 text-base font-bold rounded-xl bg-[#D4A574] hover:bg-[#D4A574]/90 text-black shadow-lg shadow-[#D4A574]/15 transition-all duration-300 active:scale-[0.98]"
                      >
                        <span className="flex items-center gap-2">
                          {mode === 'evaluate' ? <><Star className="w-4 h-4" /> {t('analyzeVibe', lang)}</> : <><Zap className="w-4 h-4" /> {t('generateNames', lang)}</>}
                        </span>
                      </Button>

                      {/* Usage indicator */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
                          <span>{t('rating', lang)}: {Math.max(0, usage.evalLimit - usage.evaluateCount)}/{usage.evalLimit}</span>
                          <span className="text-white/10">·</span>
                          <span>{t('generation', lang)}: {Math.max(0, usage.genLimit - usage.generateCount)}/{usage.genLimit}</span>
                        </div>
                        {(usage.streak > 0 || usage.shareCount > 0) && (
                          <div className="flex items-center justify-center gap-2 text-[10px]">
                            {usage.streak > 0 && (
                              <span className="text-[#D4A574]/40">🔥 {usage.streak}{t('streakDays', lang)} (+{usage.streakBonus})</span>
                            )}
                            {usage.streak > 0 && usage.shareCount > 0 && <span className="text-white/10">·</span>}
                            {usage.shareCount > 0 && (
                              <span className="text-[#D4A574]/40">📢 +{usage.shareCount * 2}</span>
                            )}
                          </div>
                        )}
                        <div className="text-center text-[10px] text-white/10">
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/92 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-5">
                  <div className="relative w-20 h-20">
                    <motion.div className="absolute inset-0 rounded-full border-2 border-[#D4A574]/10" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-2 rounded-full border-2 border-t-[#D4A574] border-r-transparent border-b-transparent border-l-transparent" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-[#D4A574]/50 border-b-transparent border-l-transparent" animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image src="/logo-v3.png" alt="" width={32} height={32} className="rounded-xl opacity-80" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg font-semibold animate-pulse">
                      {view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}
                    </p>
                    <p className="text-white/20 text-sm mt-1">
                      {view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EVAL RESULT */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/30 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <EvalResultCard result={evalResult} lang={lang} />
              </motion.div>
            )}

            {/* GEN RESULT */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/30 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} lang={lang} />
              </motion.div>
            )}

            {/* GEN EVAL RESULT */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/30 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm min-h-[44px]">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                {selectedName && (
                  <div className="text-center mb-4">
                    <p className="text-white/20 text-xs">{t('selectedName', lang)}</p>
                    <p className="text-2xl font-bold text-[#D4A574] mt-1">{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-[#D4A574] animate-spin" />
                    <p className="text-white/30 text-sm">{t('evaluatingSelected', lang)}</p>
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
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-[#D4A574]/15"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="max-w-[430px] mx-auto px-4 py-3">
              <Button
                onClick={handleShare}
                className="w-full h-12 bg-[#D4A574] hover:bg-[#D4A574]/90 text-black font-bold rounded-xl shadow-lg shadow-[#D4A574]/20 active:scale-[0.97] transition-all duration-200"
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
      <footer className="mt-auto border-t border-[#1E1E22] bg-[#0A0A0A]">
        <div className="max-w-[430px] mx-auto px-4 py-3 flex flex-col items-center gap-1" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-1.5">
            <Image src="/logo-v3.png" alt="" width={12} height={12} className="rounded opacity-30" />
            <span className="text-white/12 text-[11px]">{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-white/6 text-[10px]">{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* Paywall */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="bg-[#111113] border-[#1E1E22] text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A574]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#D4A574]" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-bold">{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center text-white/30 mt-1 text-sm">{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Usage stats */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold text-[#D4A574]">{usage.evaluateCount}/{usage.evalLimit}</p><p className="text-white/20 text-[10px]">{t('ratings', lang)}</p></div>
              <div className="w-px h-8 bg-[#1E1E22]" />
              <div className="text-center"><p className="text-2xl font-bold text-[#D4A574]">{usage.generateCount}/{usage.genLimit}</p><p className="text-white/20 text-[10px]">{t('generations', lang)}</p></div>
            </div>

            {/* Bonus info cards */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-[#0A0A0A] rounded-xl px-3 py-2 border border-[#1E1E22]">
                <span className="text-sm">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-[11px] font-medium">{t('streakTitle', lang)}</p>
                  <p className="text-white/20 text-[10px]">{t('streakDesc', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#D4A574] text-sm font-bold">{usage.streak}{lang === 'zh' ? '天' : 'd'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#0A0A0A] rounded-xl px-3 py-2 border border-[#1E1E22]">
                <span className="text-sm">📢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/50 text-[11px] font-medium">{t('shareBonusTitle', lang)}</p>
                  <p className="text-white/20 text-[10px]">{t('shareBonusInfo', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#D4A574] text-sm font-bold">+{usage.shareCount * 2}</p>
                </div>
              </div>
            </div>

            {/* Share button */}
            <Button onClick={handleShare} className="w-full bg-[#D4A574] text-black font-semibold rounded-xl h-12 hover:bg-[#D4A574]/90">
              <Share2 className="w-4 h-4 mr-1.5" /> {t('shareButton', lang)}
            </Button>

            {/* Countdown */}
            <CountdownTimer seconds={usage.secondsUntilReset} lang={lang} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaywall(false)} className="text-white/20 hover:text-white/40 hover:bg-white/[0.03] mx-auto text-sm">{t('gotIt', lang)}</Button>
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
      <p className="text-white/10 text-[10px] mb-1">{t('resetIn', lang)}</p>
      <div className="flex items-center justify-center gap-1.5">
        {[
          { val: pad(h), unit: t('hours', lang) },
          { val: pad(m), unit: t('minutes', lang) },
          { val: pad(s), unit: t('seconds', lang) },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="bg-[#0A0A0A] rounded-lg px-2 py-1 min-w-[32px] text-center border border-[#1E1E22]">
              <span className="text-white/40 text-xs font-mono font-bold">{item.val}</span>
            </div>
            <span className="text-white/8 text-[8px]">{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =================== ORNAMENTAL DIVIDER ===================

function OrnamentalDivider() {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1E1E22] to-transparent" />
      <div className="w-1.5 h-1.5 rotate-45 bg-[#D4A574]/25" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1E1E22] to-transparent" />
    </div>
  )
}

// =================== FORTUNE CARD SECTION ===================
// Image-text mode: Each card has an emoji icon, colored left border, and markdown content

function FortuneCard({ emoji, title, content, highlight, lang, accentColor }: {
  emoji: string; title: string; content: string; highlight?: boolean; lang: Lang; accentColor?: string
}) {
  const borderColor = accentColor || (highlight ? '#D4A574' : '#1E1E22')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className={`rounded-2xl overflow-hidden bg-[#111113] border border-[#1E1E22]`}
        style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
      >
        {/* Card header with emoji and title */}
        <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <h3 className={`text-[13px] font-bold ${highlight ? 'text-[#D4A574]' : 'text-white/50'}`}>{title}</h3>
        </div>
        {/* Content with markdown */}
        <div className="px-4 pb-3.5">
          <div className="text-white/60 text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =================== EVAL RESULT CARD — IMAGE-TEXT ORACLE ===================

function EvalResultCard({ result, lang }: { result: any; lang: Lang }) {
  const score = result.overallScore || 0
  const verdict = getScoreVerdict(score, lang)

  const metrics = [
    { label: t('yiXue', lang), value: result.yiXueScore, emoji: '⚡', color: '#D4A574' },
    { label: t('viral', lang), value: result.influencerLevel, emoji: '🚀', color: '#8B5CF6' },
    { label: t('accept', lang), value: result.acceptanceLevel, emoji: '💛', color: '#F59E0B' },
  ]

  const sections = [
    { emoji: '👀', title: t('nameInterpretation', lang), content: result.nameInterpretation, accentColor: '#3B82F6' },
    { emoji: '💣', title: t('redFlagCheck', lang), content: result.ambiguityCheck, accentColor: '#EF4444' },
    { emoji: '🌐', title: t('onlinePresence', lang), content: result.onlineUsageAnalysis, accentColor: '#06B6D4' },
    { emoji: '🔥', title: t('viralPotential', lang), content: result.viralPotential, highlight: true, accentColor: '#F97316' },
    { emoji: '💡', title: t('renameSuggestions', lang), content: result.renameSuggestions, accentColor: '#10B981' },
  ]

  // Score glow intensity
  const glowIntensity = score >= 75 ? 0.5 : score >= 55 ? 0.3 : 0.15
  const glowSize = score >= 75 ? 60 : score >= 55 ? 40 : 25

  return (
    <div className="space-y-3">
      {/* Oracle Scroll Header — Big Score + Verdict Stamp */}
      <div className="relative rounded-2xl overflow-hidden bg-[#111113] border border-[#1E1E22]">
        {/* Subtle paper texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,165,116,0.3) 2px, rgba(212,165,116,0.3) 3px)`,
          }}
        />
        <div className="relative pt-8 pb-6 text-center">
          {/* Fortune Card Title */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#D4A574]/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-4"
          >
            {t('fortuneCard', lang)}
          </motion.p>

          {/* Large Score with mystical glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
            className="relative inline-block"
          >
            <span
              className="text-7xl font-black text-white relative z-10 tabular-nums"
              style={{
                textShadow: `0 0 ${glowSize}px rgba(212,165,116,${glowIntensity}), 0 0 ${glowSize * 2}px rgba(212,165,116,${glowIntensity * 0.5})`,
              }}
            >
              {score}
            </span>
          </motion.div>

          <p className="text-white/15 text-[9px] tracking-[0.3em] font-medium mt-1">
            {t('overall', lang)}
          </p>

          {/* Verdict Stamp — Red seal style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="mt-4 flex justify-center"
          >
            <div className="relative">
              {/* Stamp background */}
              <div className="absolute inset-0 bg-[#D4A574]/5 rounded-full scale-125 blur-md" />
              <span className="relative inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#D4A574]/8 border-2 border-[#D4A574]/20 text-[#D4A574] text-sm font-black tracking-wide">
                {verdict}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fortune Cookie Summary Quote */}
      {result.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="relative px-6 py-5 text-center bg-[#111113] rounded-2xl border border-[#1E1E22]"
        >
          <span className="absolute top-2 left-4 text-4xl text-[#D4A574]/10 font-serif leading-none">&ldquo;</span>
          <p className="text-white/55 text-[15px] leading-relaxed font-medium">
            {result.summary}
          </p>
          <span className="absolute bottom-2 right-4 text-4xl text-[#D4A574]/10 font-serif leading-none">&rdquo;</span>
        </motion.div>
      )}

      {/* Visual Metric Bars — Gradient fills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="space-y-3 bg-[#111113] border border-[#1E1E22] rounded-2xl p-4"
      >
        {metrics.map((m, i) => (
          <div key={m.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{m.emoji}</span>
                <span className="text-white/40 text-[11px] font-medium">{m.label}</span>
              </div>
              <span className="text-white/60 text-xs font-bold tabular-nums">{m.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0A0A0A]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${m.color}40, ${m.color})`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(m.value, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.9 + i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Decorative Divider */}
      <OrnamentalDivider />

      {/* Detail Sections — Image-Text Fortune Cards */}
      {sections.filter(s => s.content && s.content !== t('locked', lang)).map((section, i) => (
        <div key={section.title}>
          <FortuneCard
            emoji={section.emoji}
            title={section.title}
            content={section.content}
            highlight={section.highlight}
            lang={lang}
            accentColor={section.accentColor}
          />
          {i < sections.filter(s => s.content && s.content !== t('locked', lang)).length - 1 && <OrnamentalDivider />}
        </div>
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
        <FortuneCard emoji="🔮" title={t('yiXueAnalysis', lang)} content={result.yiXueAnalysis} accentColor="#8B5CF6" lang={lang} />
      )}

      {/* Suggested Industries */}
      {result.suggestedIndustries && (
        <>
          <OrnamentalDivider />
          <FortuneCard emoji="💼" title={t('suggestedIndustries', lang)} content={result.suggestedIndustries} accentColor="#06B6D4" lang={lang} />
        </>
      )}

      {/* Name Cards */}
      {result.names?.length > 0 && (
        <>
          <OrnamentalDivider />
          <div className="flex items-center gap-2 pt-1">
            <span className="text-base">🏆</span>
            <span className="text-white/40 text-sm font-bold">{t('top5Picks', lang)}</span>
          </div>
          <div className="space-y-2">
            {result.names.map((nameItem: any, index: number) => {
              const isConfirming = confirmingName === nameItem.name
              const rank = index + 1
              const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
              // Each card has a different left border color based on rank
              const rankColors = ['#D4A574', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B']
              const accentColor = rankColors[index] || '#1E1E22'

              return (
                <motion.div key={nameItem.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                  whileTap={{ scale: 0.98 }} onClick={() => handleSelect(nameItem.name)} className="cursor-pointer">
                  <Card className={`bg-[#111113] rounded-2xl transition-all duration-200 overflow-hidden ${
                    isConfirming ? 'border-[#D4A574]/25 shadow-md shadow-[#D4A574]/5' : 'border-[#1E1E22] hover:border-[#D4A574]/15'
                  }`}
                    style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-8 h-8 rounded-lg bg-[#D4A574]/10 flex items-center justify-center shrink-0">
                          {rankEmoji ? <span className="text-sm">{rankEmoji}</span> : <span className="text-[#D4A574]/50 font-bold text-xs">{rank}</span>}
                        </div>
                        {/* Name + Reason */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm">{nameItem.name}</p>
                          <p className="text-white/30 text-[11px] mt-0.5 line-clamp-2">{nameItem.reason}</p>
                        </div>
                        {/* Score + Style */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={`${
                            nameItem.score >= 80 ? 'bg-[#D4A574]/15 text-[#D4A574]' :
                            nameItem.score >= 60 ? 'bg-[#D4A574]/10 text-[#D4A574]/60' :
                            'bg-[#1E1E22] text-white/35'
                          } border-0 text-[11px] font-bold`}>
                            {nameItem.score}{t('score', lang)}
                          </Badge>
                          <span className="text-white/15 text-[10px]">{nameItem.style}</span>
                        </div>
                      </div>
                      {isConfirming && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-[#D4A574] text-xs font-medium">
                          {t('confirmSelect', lang)}
                        </motion.div>
                      )}
                      {!isConfirming && (
                        <div className="mt-1.5 text-center text-white/8 text-[10px]">{t('clickToSelect', lang)}</div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
