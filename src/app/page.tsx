'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, ArrowLeft, Lock, Share2, Globe, Clock,
  Star, Shield, Eye, TrendingUp, Users, Heart,
  Flame, Pen, Briefcase, Crown, Check, Loader2, Languages,
  ChevronDown, Calendar
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import { type Lang, t } from '@/lib/i18n'

// ===================== CONSTANTS =====================

const CALENDAR_TYPES = [
  { value: 'solar', label: '🌐' },
  { value: 'lunar', label: '🌙' },
  { value: 'islamic', label: '☪️' },
]

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

function getScoreEmoji(score: number): string {
  if (score >= 90) return '👑'
  if (score >= 75) return '🌟'
  if (score >= 55) return '😐'
  if (score >= 35) return '🫠'
  return '💀'
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

  // Form state
  const [nameInput, setNameInput] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [calendarType, setCalendarType] = useState('solar')
  const [birthPlace, setBirthPlace] = useState('')
  const [platform, setPlatform] = useState('')
  const [specialRequirements, setSpecialRequirements] = useState('')
  const [lockedWords, setLockedWords] = useState('')
  const [nameError, setNameError] = useState('')

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

  // Calendar label helper
  const calendarLabel = (val: string) => {
    if (val === 'lunar') return t('calendarLunar', lang)
    return t('calendarSolar', lang)
  }

  // Platform label helper
  const platformLabel = (p: typeof PLATFORMS[0]) => lang === 'zh' ? p.labelZh : p.labelEn

  // =================== RENDER ===================

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090b]/95 backdrop-blur-xl border-b border-amber-500/10">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="名鉴" width={36} height={36} className="rounded-xl" priority />
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-base tracking-tight">{t('appName', lang)}</span>
              <Badge variant="outline" className="border-amber-500/20 text-amber-500/50 text-[9px] px-1 py-0">v1.0.3</Badge>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 text-amber-400/70 hover:text-amber-300 text-xs font-medium transition-all duration-200 active:scale-95"
            title={lang === 'zh' ? 'Switch to English' : '切换中文'}
          >
            <Languages className="w-3 h-3" />
            <span>{lang === 'zh' ? 'EN' : '中'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 pb-safe">
        <div className="max-w-md mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {/* HOME VIEW */}
            {(view === 'home') && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Hero - Compact for mobile */}
                <div className="text-center mb-5">
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                      {t('heroTitle1', lang)}
                      <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                        {t('heroTitle2', lang)}
                      </span>
                    </h1>
                    <p className="text-white/35 text-xs mt-1.5">{t('heroSub', lang)}</p>
                  </motion.div>

                  {/* Mode Toggle - Pill style */}
                  <motion.div className="mt-4 flex bg-white/[0.04] rounded-full p-1 gap-0.5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <button
                      onClick={() => setMode('evaluate')}
                      className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        mode === 'evaluate'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25'
                          : 'text-white/35 hover:text-white/55'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" /> {t('rateMyName', lang)}
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        mode === 'generate'
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                          : 'text-white/35 hover:text-white/55'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" /> {t('generateName', lang)}
                    </button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-4 space-y-3.5">
                      {/* Name Input (evaluate mode only) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs font-medium">{t('onlineName', lang)} *</Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder={t('onlineNamePlaceholder', lang)}
                            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 h-11 rounded-xl text-sm"
                          />
                          {nameError && <p className="text-orange-400 text-xs">{nameError}</p>}
                        </div>
                      )}

                      {/* Birth Date - Streamlined */}
                      <div className="space-y-1">
                        <Label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" /> {t('birthDate', lang)}
                        </Label>
                        {/* Calendar type pills + Date input */}
                        <div className="flex gap-1.5 mb-1.5">
                          {CALENDAR_TYPES.map(ct => (
                            <button
                              key={ct.value}
                              onClick={() => setCalendarType(ct.value)}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                                calendarType === ct.value
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:border-white/10'
                              }`}
                            >
                              {ct.label} {calendarLabel(ct.value)}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 h-11 rounded-xl [color-scheme:dark] text-sm"
                            />
                          </div>
                          <div className="w-[100px]">
                            <Input
                              type="time"
                              value={birthTime}
                              onChange={(e) => setBirthTime(e.target.value)}
                              placeholder={t('birthTime', lang)}
                              className="bg-white/[0.04] border-white/[0.08] text-white focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 h-11 rounded-xl [color-scheme:dark] text-sm"
                            />
                          </div>
                        </div>
                        <p className="text-white/20 text-[10px]">{t('birthTime', lang)} · {t('optional', lang)}</p>
                      </div>

                      {/* Auto Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                          <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-amber-400 text-[10px] font-bold tracking-wider">{t('autoBazi', lang)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center">
                              {[
                                { label: t('year', lang), val: baziData.yearPillar },
                                { label: t('month', lang), val: baziData.monthPillar },
                                { label: t('day', lang), val: baziData.dayPillar },
                                { label: t('hour', lang), val: baziData.hourPillar },
                              ].map(p => (
                                <div key={p.label} className="bg-white/[0.04] rounded-lg py-1.5">
                                  <div className="text-white font-bold text-sm">{p.val}</div>
                                  <div className="text-white/25 text-[9px]">{p.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/25">
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && (
                                <span className="text-orange-400/50">{t('missing', lang)}{baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-1.5 text-white/25 text-[11px]">
                          <Loader2 className="w-3 h-3 animate-spin" /> {t('calculatingBazi', lang)}
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-1">
                        <Label className="text-white/50 text-xs font-medium">{t('birthPlace', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder={t('birthPlacePlaceholder', lang)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15 h-11 rounded-xl text-sm"
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-1">
                        <Label className="text-white/50 text-xs font-medium">{t('mainPlatform', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-11 rounded-xl text-sm">
                            <SelectValue placeholder={t('selectPlatform', lang)} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#161618] border-white/[0.08] rounded-xl max-h-56">
                            <div className="px-2 py-1 text-[10px] text-white/25 font-semibold uppercase tracking-wider">{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/70 focus:bg-white/[0.06] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                            <div className="px-2 py-1 text-[10px] text-white/25 font-semibold uppercase tracking-wider mt-1">{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/70 focus:bg-white/[0.06] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/70 focus:bg-white/[0.06] focus:text-white text-sm">{platformLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs font-medium">{t('specialRequirements', lang)} <span className="text-white/20">({t('optional', lang)})</span></Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder={t('specialRequirementsPlaceholder', lang)}
                              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-orange-500/40 focus-visible:ring-orange-500/15 min-h-[60px] rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs font-medium">{t('lockWords', lang)} <span className="text-white/20">({t('lockWordsHint', lang)})</span></Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder={t('lockWordsPlaceholder', lang)}
                              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:border-orange-500/40 focus-visible:ring-orange-500/15 h-11 rounded-xl text-sm"
                            />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <Button
                        onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate}
                        disabled={isLoading || (mode === 'evaluate' && usage.evaluateUsed) || (mode === 'generate' && usage.generateUsed)}
                        className={`w-full h-12 text-base font-bold rounded-xl transition-all duration-300 active:scale-[0.98] ${
                          mode === 'evaluate'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20'
                            : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white shadow-lg shadow-orange-500/20'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {mode === 'evaluate' ? <><Star className="w-4 h-4" /> {t('analyzeVibe', lang)}</> : <><Zap className="w-4 h-4" /> {t('generateNames', lang)}</>}
                        </span>
                      </Button>

                      {/* Usage indicator */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-center gap-3 text-[11px] text-white/25">
                          <span>{t('rating', lang)}: {Math.max(0, usage.evalLimit - usage.evaluateCount)}/{usage.evalLimit}</span>
                          <span className="text-white/8">·</span>
                          <span>{t('generation', lang)}: {Math.max(0, usage.genLimit - usage.generateCount)}/{usage.genLimit}</span>
                        </div>
                        {(usage.streak > 0 || usage.shareCount > 0) && (
                          <div className="flex items-center justify-center gap-2 text-[10px]">
                            {usage.streak > 0 && (
                              <span className="text-amber-400/40">🔥 {usage.streak}{t('streakDays', lang)} (+{usage.streakBonus})</span>
                            )}
                            {usage.streak > 0 && usage.shareCount > 0 && <span className="text-white/8">·</span>}
                            {usage.shareCount > 0 && (
                              <span className="text-amber-400/40">📢 +{usage.shareCount * 2}</span>
                            )}
                          </div>
                        )}
                        <div className="text-center text-[10px] text-white/12">
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/92 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-5">
                  <div className="relative w-20 h-20">
                    <motion.div className="absolute inset-0 rounded-full border-2 border-amber-500/15" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-2 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-orange-400 border-b-transparent border-l-transparent" animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg opacity-80" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg font-semibold animate-pulse">
                      {view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}
                    </p>
                    <p className="text-white/25 text-sm mt-1">
                      {view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EVAL RESULT */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/35 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <EvalResultCard result={evalResult} onShare={handleShare} lang={lang} />
              </motion.div>
            )}

            {/* GEN RESULT */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/35 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} lang={lang} />
              </motion.div>
            )}

            {/* GEN EVAL RESULT */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/35 hover:text-white hover:bg-white/5 gap-1.5 mb-3 -ml-2 text-sm">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                {selectedName && (
                  <div className="text-center mb-4">
                    <p className="text-white/25 text-xs">{t('selectedName', lang)}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent mt-1">{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-white/35 text-sm">{t('evaluatingSelected', lang)}</p>
                  </div>
                ) : evalResult && <EvalResultCard result={evalResult} onShare={handleShare} lang={lang} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-500/5 bg-[#09090b]">
        <div className="max-w-md mx-auto px-4 py-4 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Image src="/logo.png" alt="" width={14} height={14} className="rounded opacity-40" />
            <span className="text-white/15 text-[11px]">{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-white/8 text-[10px]">{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* Paywall */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="bg-[#111113] border-amber-500/10 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-bold">{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center text-white/35 mt-1 text-sm">{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Usage stats */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold text-amber-400">{usage.evaluateCount}/{usage.evalLimit}</p><p className="text-white/25 text-[10px]">{t('ratings', lang)}</p></div>
              <div className="w-px h-8 bg-white/8" />
              <div className="text-center"><p className="text-2xl font-bold text-orange-400">{usage.generateCount}/{usage.genLimit}</p><p className="text-white/25 text-[10px]">{t('generations', lang)}</p></div>
            </div>

            {/* Bonus info cards */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-white/[0.02] rounded-xl px-3 py-2">
                <span className="text-sm">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-[11px] font-medium">{t('streakTitle', lang)}</p>
                  <p className="text-white/25 text-[10px]">{t('streakDesc', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 text-sm font-bold">{usage.streak}{lang === 'zh' ? '天' : 'd'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.02] rounded-xl px-3 py-2">
                <span className="text-sm">📢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-[11px] font-medium">{t('shareBonusTitle', lang)}</p>
                  <p className="text-white/25 text-[10px]">{t('shareBonusInfo', lang)}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 text-sm font-bold">+{usage.shareCount * 2}</p>
                </div>
              </div>
            </div>

            {/* Share button */}
            <Button onClick={handleShare} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl h-11">
              <Share2 className="w-4 h-4 mr-1.5" /> {t('shareButton', lang)}
            </Button>

            {/* Countdown */}
            <CountdownTimer seconds={usage.secondsUntilReset} lang={lang} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaywall(false)} className="text-white/25 hover:text-white/50 hover:bg-white/[0.03] mx-auto text-sm">{t('gotIt', lang)}</Button>
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
      <p className="text-white/15 text-[10px] mb-1">{t('resetIn', lang)}</p>
      <div className="flex items-center justify-center gap-1.5">
        {[
          { val: pad(h), unit: t('hours', lang) },
          { val: pad(m), unit: t('minutes', lang) },
          { val: pad(s), unit: t('seconds', lang) },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="bg-white/[0.04] rounded-lg px-2 py-1 min-w-[32px] text-center">
              <span className="text-white/50 text-xs font-mono font-bold">{item.val}</span>
            </div>
            <span className="text-white/10 text-[8px]">{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =================== EVAL RESULT CARD - VISUAL REPORT ===================

function EvalResultCard({ result, onShare, lang }: { result: any; onShare: () => void; lang: Lang }) {
  const score = result.overallScore || 0
  const circumference = 2 * Math.PI * 52
  const offset = circumference - (score / 100) * circumference
  const verdict = getScoreVerdict(score, lang)
  const verdictEmoji = getScoreEmoji(score)

  // Score ring color
  const scoreColor = score >= 75 ? '#f59e0b' : score >= 55 ? '#fb923c' : score >= 35 ? '#ef4444' : '#dc2626'

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

  return (
    <div className="space-y-3">
      {/* Score Hero - Visual Card */}
      <Card className="bg-gradient-to-b from-amber-500/[0.06] to-transparent border-amber-500/10 rounded-2xl overflow-hidden">
        <CardContent className="pt-6 pb-5 text-center">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
              <motion.circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }} style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className="text-3xl font-black text-white" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>{score}</motion.span>
              <span className="text-white/20 text-[9px] tracking-widest font-medium">{t('overall', lang)}</span>
            </div>
          </div>
          {/* Verdict Badge */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-bold">
              {verdict}
            </span>
          </motion.div>
          {result.summary && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-white/45 text-sm mt-3 leading-relaxed max-w-[280px] mx-auto italic">
              &ldquo;{result.summary}&rdquo;
            </motion.p>
          )}
        </CardContent>
      </Card>

      {/* Metrics - Compact Grid */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(m => (
          <Card key={m.label} className="bg-white/[0.02] border-white/[0.05] rounded-xl">
            <CardContent className="pt-3 pb-2.5 text-center px-2">
              <div className="text-lg mb-0.5">{m.emoji}</div>
              <div className="text-xl font-black text-white">{m.value}</div>
              <div className="text-white/25 text-[10px]">{m.label}</div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                  initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 0.8, delay: 0.5 }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sections - Visual Cards */}
      {sections.filter(s => s.content && s.content !== t('locked', lang)).map((section, i) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
          <Card className={`bg-white/[0.02] border-white/[0.05] rounded-2xl ${section.highlight ? 'border-amber-500/20 shadow-lg shadow-amber-500/5' : ''}`}>
            <CardHeader className="pb-1 pt-3.5 px-4">
              <div className="flex items-center gap-2">
                <span className="text-base">{section.emoji}</span>
                <CardTitle className={`text-[13px] font-bold ${section.highlight ? 'text-amber-300' : 'text-white/55'}`}>{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3.5 px-4">
              <div className="text-white/65 text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Share */}
      <motion.div className="flex justify-center pt-2 pb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <Button onClick={onShare} className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.97] transition-transform">
          <Share2 className="w-4 h-4 mr-1.5" /> {t('shareMyScore', lang)}
        </Button>
      </motion.div>
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
        <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🔮</span>
              <CardTitle className="text-[13px] font-bold text-white/55">{t('yiXueAnalysis', lang)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3.5 px-4">
            <div className="text-white/65 text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed"><ReactMarkdown>{result.yiXueAnalysis}</ReactMarkdown></div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Industries */}
      {result.suggestedIndustries && (
        <Card className="bg-white/[0.02] border-white/[0.05] rounded-2xl">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <div className="flex items-center gap-2">
              <span className="text-base">💼</span>
              <CardTitle className="text-[13px] font-bold text-white/55">{t('suggestedIndustries', lang)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3.5 px-4">
            <div className="text-white/65 text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed"><ReactMarkdown>{result.suggestedIndustries}</ReactMarkdown></div>
          </CardContent>
        </Card>
      )}

      {/* Name Cards */}
      {result.names?.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-base">🏆</span>
            <span className="text-white/45 text-sm font-bold">{t('top5Picks', lang)}</span>
          </div>
          <div className="space-y-2">
            {result.names.map((nameItem: any, index: number) => {
              const isConfirming = confirmingName === nameItem.name
              const rank = index + 1
              const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
              return (
                <motion.div key={nameItem.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                  whileTap={{ scale: 0.98 }} onClick={() => handleSelect(nameItem.name)} className="cursor-pointer">
                  <Card className={`bg-white/[0.02] rounded-2xl transition-all duration-200 ${
                    isConfirming ? 'border-amber-500/30 shadow-md shadow-amber-500/5' : 'border-white/[0.05] hover:border-white/10'
                  }`}>
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          {rankEmoji ? <span className="text-sm">{rankEmoji}</span> : <span className="text-amber-400/60 font-bold text-xs">{rank}</span>}
                        </div>
                        {/* Name + Reason */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm">{nameItem.name}</p>
                          <p className="text-white/35 text-[11px] mt-0.5 line-clamp-2">{nameItem.reason}</p>
                        </div>
                        {/* Score + Style */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={`${
                            nameItem.score >= 80 ? 'bg-amber-500/15 text-amber-300' :
                            nameItem.score >= 60 ? 'bg-orange-500/15 text-orange-300' :
                            'bg-white/5 text-white/40'
                          } border-0 text-[11px] font-bold`}>
                            {nameItem.score}{t('score', lang)}
                          </Badge>
                          <span className="text-white/15 text-[10px]">{nameItem.style}</span>
                        </div>
                      </div>
                      {isConfirming && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-amber-400 text-xs font-medium">
                          {t('confirmSelect', lang)}
                        </motion.div>
                      )}
                      {!isConfirming && (
                        <div className="mt-1.5 text-center text-white/10 text-[10px]">{t('clickToSelect', lang)}</div>
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
