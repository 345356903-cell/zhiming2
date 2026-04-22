'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, ArrowLeft, Lock, Share2, Globe, Clock,
  ChevronRight, Star, Shield, Eye, TrendingUp, Users, Heart,
  Flame, Pen, Briefcase, Crown, Check, Loader2, Languages
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
  { value: 'solar', icon: '🌐' },
  { value: 'lunar', icon: '🌙' },
  { value: 'islamic', icon: '☪️' },
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
}

// ===================== MAIN APP =====================

export default function Home() {
  const [view, setView] = useState<AppView>('home')
  const [mode, setMode] = useState<'evaluate' | 'generate'>('evaluate')
  const [fingerprint, setFingerprint] = useState('')
  const [lang, setLang] = useState<Lang>('zh')
  const [usage, setUsage] = useState<UsageState>({ evaluateUsed: false, generateUsed: false, evaluateCount: 0, generateCount: 0, evalLimit: 3, genLimit: 3, shareCount: 0 })
  const [evalResult, setEvalResult] = useState<any>(null)
  const [genResult, setGenResult] = useState<any>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
          evalLimit: d.evalLimit || 3, genLimit: d.genLimit || 3, shareCount: d.shareCount || 0,
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
    // Record share to backend for bonus
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
    if (val === 'solar') return t('calendarSolar', lang)
    if (val === 'lunar') return t('calendarLunar', lang)
    return t('calendarIslamic', lang)
  }

  // Platform label helper
  const platformLabel = (p: typeof PLATFORMS[0]) => lang === 'zh' ? p.labelZh : p.labelEn

  // =================== RENDER ===================

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">{t('appName', lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-all duration-200"
              title={lang === 'zh' ? 'Switch to English' : '切换中文'}
            >
              <Languages className="w-3 h-3" />
              <span>{lang === 'zh' ? 'EN' : '中'}</span>
            </button>
            <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] px-1.5">v1.0.2</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
          <AnimatePresence mode="wait">
            {/* HOME VIEW */}
            {(view === 'home') && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Hero */}
                <div className="text-center mb-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {t('heroTitle1', lang)}
                      <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                        {t('heroTitle2', lang)}
                      </span>
                    </h1>
                    <p className="text-white/40 text-sm mt-2">{t('heroSub', lang)}</p>
                  </motion.div>

                  {/* Mode Toggle */}
                  <motion.div className="mt-5 flex bg-white/5 rounded-2xl p-1 gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <button
                      onClick={() => setMode('evaluate')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${mode === 'evaluate' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Star className="w-3.5 h-3.5" /> {t('rateMyName', lang)}
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${mode === 'generate' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Zap className="w-3.5 h-3.5" /> {t('generateName', lang)}
                    </button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Name Input (evaluate mode only) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-1.5">
                          <Label className="text-white/60 text-xs font-medium">{t('onlineName', lang)} *</Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder={t('onlineNamePlaceholder', lang)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl"
                          />
                          {nameError && <p className="text-pink-400 text-xs">{nameError}</p>}
                        </div>
                      )}

                      {/* Birth Date + Calendar Type */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                          <Globe className="w-3 h-3" /> {t('birthDate', lang)}
                        </Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              className="bg-white/5 border-white/10 text-white focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl [color-scheme:dark]"
                            />
                          </div>
                          <Select value={calendarType} onValueChange={setCalendarType}>
                            <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white h-11 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-white/10 rounded-xl">
                              {CALENDAR_TYPES.map(ct => (
                                <SelectItem key={ct.value} value={ct.value} className="text-white/80 focus:bg-white/10 focus:text-white">
                                  {ct.icon} {calendarLabel(ct.value)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Birth Time */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {t('birthTime', lang)} <span className="text-white/30">({t('optional', lang)})</span>
                        </Label>
                        <Input
                          type="time"
                          value={birthTime}
                          onChange={(e) => setBirthTime(e.target.value)}
                          className="bg-white/5 border-white/10 text-white focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl [color-scheme:dark]"
                        />
                      </div>

                      {/* Auto Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-violet-400 text-xs font-semibold">{t('autoBazi', lang)}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: t('year', lang), val: baziData.yearPillar },
                                { label: t('month', lang), val: baziData.monthPillar },
                                { label: t('day', lang), val: baziData.dayPillar },
                                { label: t('hour', lang), val: baziData.hourPillar },
                              ].map(p => (
                                <div key={p.label} className="bg-white/5 rounded-lg py-1.5">
                                  <div className="text-white font-bold text-sm">{p.val}</div>
                                  <div className="text-white/30 text-[10px]">{p.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && (
                                <span className="text-pink-400/60">{t('missing', lang)}{baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-2 text-white/30 text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" /> {t('calculatingBazi', lang)}
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium">{t('birthPlace', lang)} <span className="text-white/30">({t('optional', lang)})</span></Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder={t('birthPlacePlaceholder', lang)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl"
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium">{t('mainPlatform', lang)} <span className="text-white/30">({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                            <SelectValue placeholder={t('selectPlatform', lang)} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10 rounded-xl max-h-64">
                            <div className="px-2 py-1.5 text-[10px] text-white/30 font-semibold uppercase tracking-wider">{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{platformLabel(p)}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-1">{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{platformLabel(p)}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{platformLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs font-medium">{t('specialRequirements', lang)} <span className="text-white/30">({t('optional', lang)})</span></Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder={t('specialRequirementsPlaceholder', lang)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-pink-500/50 focus-visible:ring-pink-500/20 min-h-[72px] rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs font-medium">{t('lockWords', lang)} <span className="text-white/30">({t('lockWordsHint', lang)})</span></Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder={t('lockWordsPlaceholder', lang)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-pink-500/50 focus-visible:ring-pink-500/20 h-11 rounded-xl"
                            />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <Button
                        onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate}
                        disabled={isLoading || (mode === 'evaluate' && usage.evaluateUsed) || (mode === 'generate' && usage.generateUsed)}
                        className={`w-full h-12 text-base font-bold rounded-xl transition-all duration-300 group relative overflow-hidden ${
                          mode === 'evaluate'
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20'
                            : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg shadow-pink-500/20'
                        }`}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          {mode === 'evaluate' ? <><Star className="w-4 h-4" /> {t('analyzeVibe', lang)}</> : <><Zap className="w-4 h-4" /> {t('generateNames', lang)}</>}
                        </span>
                      </Button>

                      {/* Usage indicator */}
                      <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
                        <span>{t('rating', lang)}: {Math.max(0, usage.evalLimit - usage.evaluateCount)}/{usage.evalLimit} {t('freeLeft', lang)}</span>
                        <span>·</span>
                        <span>{t('generation', lang)}: {Math.max(0, usage.genLimit - usage.generateCount)}/{usage.genLimit} {t('freeLeft', lang)}</span>
                      </div>
                      <div className="text-center text-[10px] text-violet-400/40">
                        {t('dailyReset', lang)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* LOADING OVERLAY */}
            {(view === 'evaluating' || view === 'generating') && isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-5">
                  <div className="relative w-20 h-20">
                    <motion.div className="absolute inset-0 rounded-full border-2 border-violet-500/20" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-2 rounded-full border-2 border-t-violet-400 border-r-transparent border-b-transparent border-l-transparent" animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                    <motion.div className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-fuchsia-400 border-b-transparent border-l-transparent" animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-lg font-semibold animate-pulse">
                      {view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}
                    </p>
                    <p className="text-white/30 text-sm mt-1">
                      {view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EVAL RESULT */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <EvalResultCard result={evalResult} onShare={handleShare} lang={lang} />
              </motion.div>
            )}

            {/* GEN RESULT */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} lang={lang} />
              </motion.div>
            )}

            {/* GEN EVAL RESULT */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> {t('back', lang)}
                </Button>
                {selectedName && (
                  <div className="text-center mb-5">
                    <p className="text-white/30 text-xs">{t('selectedName', lang)}</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mt-1">{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    <p className="text-white/40 text-sm">{t('evaluatingSelected', lang)}</p>
                  </div>
                ) : evalResult && <EvalResultCard result={evalResult} onShare={handleShare} lang={lang} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-lg mx-auto px-4 py-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-white/20 text-xs">{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-white/10 text-[10px]">{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* Paywall */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-violet-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-bold">{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center text-white/40 mt-1">{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold text-violet-400">{usage.evaluateCount}/{usage.evalLimit}</p><p className="text-white/30 text-[10px]">{t('ratings', lang)}</p></div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center"><p className="text-2xl font-bold text-pink-400">{usage.generateCount}/{usage.genLimit}</p><p className="text-white/30 text-[10px]">{t('generations', lang)}</p></div>
            </div>
            <Button onClick={handleShare} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl h-10">
              <Share2 className="w-4 h-4 mr-1.5" /> {t('shareButton', lang)}
            </Button>
            <p className="text-center text-[10px] text-violet-400/50">{t('dailyReset', lang)}</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaywall(false)} className="text-white/30 hover:text-white/60 hover:bg-white/5 mx-auto">{t('gotIt', lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== EVAL RESULT CARD ===================

function EvalResultCard({ result, onShare, lang }: { result: any; onShare: () => void; lang: Lang }) {
  const score = result.overallScore || 0
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  const scoreColor = score < 40 ? '#f43f5e' : score <= 70 ? '#f59e0b' : '#8b5cf6'

  const metrics = [
    { label: t('yiXue', lang), value: result.yiXueScore, icon: Star },
    { label: t('viral', lang), value: result.influencerLevel, icon: TrendingUp },
    { label: t('accept', lang), value: result.acceptanceLevel, icon: Heart },
  ]

  const sections = [
    { icon: Eye, title: t('nameInterpretation', lang), content: result.nameInterpretation },
    { icon: Shield, title: t('redFlagCheck', lang), content: result.ambiguityCheck },
    { icon: Users, title: t('onlinePresence', lang), content: result.onlineUsageAnalysis },
    { icon: Flame, title: t('viralPotential', lang), content: result.viralPotential, highlight: true },
    { icon: Pen, title: t('renameSuggestions', lang), content: result.renameSuggestions },
  ]

  return (
    <div className="space-y-3">
      {/* Score Hero */}
      <Card className="bg-white/[0.03] border-white/[0.06] rounded-2xl overflow-hidden">
        <CardContent className="pt-6 pb-6 text-center">
          <div className="relative w-36 h-36 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <motion.circle cx="64" cy="64" r="54" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }} style={{ filter: `drop-shadow(0 0 8px ${scoreColor})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className="text-4xl font-extrabold text-white" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>{score}</motion.span>
              <span className="text-white/30 text-[10px] tracking-wider">{t('overall', lang)}</span>
            </div>
          </div>
          {result.summary && <p className="text-white/50 text-sm mt-4 leading-relaxed max-w-xs mx-auto">{result.summary}</p>}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(m => (
          <Card key={m.label} className="bg-white/[0.03] border-white/[0.06] rounded-xl">
            <CardContent className="pt-3 pb-3 text-center">
              <m.icon className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-white">{m.value}</div>
              <div className="text-white/30 text-[10px]">{m.label}</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  initial={{ width: 0 }} animate={{ width: `${m.value}%` }} transition={{ duration: 1, delay: 0.5 }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sections */}
      {sections.filter(s => s.content && s.content !== t('locked', lang)).map((section, i) => (
        <motion.div key={section.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
          <Card className={`bg-white/[0.03] border-white/[0.06] rounded-2xl ${section.highlight ? 'border-violet-500/30 shadow-lg shadow-violet-500/5' : ''}`}>
            <CardHeader className="pb-1 pt-4 px-4">
              <div className="flex items-center gap-2">
                <section.icon className={`w-3.5 h-3.5 ${section.highlight ? 'text-violet-400' : 'text-white/30'}`} />
                <CardTitle className={`text-sm font-semibold ${section.highlight ? 'text-violet-300' : 'text-white/60'}`}>{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="text-white/70 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Share */}
      <motion.div className="flex justify-center pt-2 pb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
        <Button onClick={onShare} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20">
          <Share2 className="w-4 h-4 mr-1.5" /> {t('shareMyScore', lang)}
        </Button>
      </motion.div>
    </div>
  )
}

// =================== GEN RESULT CARD ===================

function GenResultCard({ result, onNameSelect, lang }: { result: any; onNameSelect: (name: string) => void; lang: Lang }) {
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [confirmingName, setConfirmingName] = useState<string | null>(null)

  const handleSelect = (name: string) => {
    if (confirmingName === name) { setSelectedName(name); onNameSelect(name); setConfirmingName(null) }
    else { setConfirmingName(name); setTimeout(() => setConfirmingName(prev => prev === name ? null : prev), 3000) }
  }

  return (
    <div className="space-y-3">
      {/* Yi Xue Analysis */}
      {result.yiXueAnalysis && (
        <Card className="bg-white/[0.03] border-white/[0.06] rounded-2xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-violet-400" /><CardTitle className="text-sm font-semibold text-white/60">{t('yiXueAnalysis', lang)}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="text-white/70 text-sm leading-relaxed prose prose-invert prose-sm max-w-none"><ReactMarkdown>{result.yiXueAnalysis}</ReactMarkdown></div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Industries */}
      {result.suggestedIndustries && (
        <Card className="bg-white/[0.03] border-white/[0.06] rounded-2xl">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-violet-400" /><CardTitle className="text-sm font-semibold text-white/60">{t('suggestedIndustries', lang)}</CardTitle></div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="text-white/70 text-sm leading-relaxed prose prose-invert prose-sm max-w-none"><ReactMarkdown>{result.suggestedIndustries}</ReactMarkdown></div>
          </CardContent>
        </Card>
      )}

      {/* Name Cards */}
      {result.names?.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <Crown className="w-4 h-4 text-violet-400" />
            <span className="text-white/50 text-sm font-semibold">{t('top5Picks', lang)}</span>
          </div>
          <div className="space-y-2">
            {result.names.map((nameItem: any, index: number) => {
              const isSelected = selectedName === nameItem.name
              const isConfirming = confirmingName === nameItem.name
              return (
                <motion.div key={nameItem.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => handleSelect(nameItem.name)} className="cursor-pointer">
                  <Card className={`bg-white/[0.03] rounded-2xl transition-all duration-200 ${
                    isSelected ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' :
                    isConfirming ? 'border-fuchsia-500/40 shadow-md shadow-fuchsia-500/5' :
                    'border-white/[0.06] hover:border-white/10'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-bold">{nameItem.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">{nameItem.reason}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`${
                            nameItem.score >= 80 ? 'bg-violet-500/20 text-violet-300' :
                            nameItem.score >= 60 ? 'bg-amber-500/20 text-amber-300' :
                            'bg-white/10 text-white/50'
                          } border-0 text-xs font-bold`}>
                            {nameItem.score}{t('score', lang)}
                          </Badge>
                          <span className="text-white/20 text-[10px]">{nameItem.style}</span>
                        </div>
                      </div>
                      {isConfirming && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center text-fuchsia-400 text-xs font-medium">
                          {t('confirmSelect', lang)}
                        </motion.div>
                      )}
                      {!isSelected && !isConfirming && (
                        <div className="mt-2 text-center text-white/15 text-[10px]">{t('clickToSelect', lang)}</div>
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
