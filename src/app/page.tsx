'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Zap, ArrowLeft, Lock, Share2, Globe, Clock,
  ChevronRight, Star, Shield, Eye, TrendingUp, Users, Heart,
  Flame, Pen, Briefcase, Crown, Check, Loader2
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

// ===================== CONSTANTS =====================

const CALENDAR_TYPES = [
  { value: 'solar', label: 'Gregorian', zh: '阳历', icon: '🌐' },
  { value: 'lunar', label: 'Lunar', zh: '农历', icon: '🌙' },
  { value: 'islamic', label: 'Hijri', zh: '伊斯兰历', icon: '☪️' },
]

const PLATFORMS = [
  { value: 'wechat', label: 'WeChat / 微信', region: 'cn' },
  { value: 'douyin', label: 'Douyin / 抖音', region: 'cn' },
  { value: 'xiaohongshu', label: 'RED / 小红书', region: 'cn' },
  { value: 'weibo', label: 'Weibo / 微博', region: 'cn' },
  { value: 'bilibili', label: 'Bilibili / B站', region: 'cn' },
  { value: 'qq', label: 'QQ', region: 'cn' },
  { value: 'tiktok', label: 'TikTok', region: 'global' },
  { value: 'instagram', label: 'Instagram', region: 'global' },
  { value: 'twitter', label: 'X / Twitter', region: 'global' },
  { value: 'youtube', label: 'YouTube', region: 'global' },
  { value: 'discord', label: 'Discord', region: 'global' },
  { value: 'threads', label: 'Threads', region: 'global' },
  { value: 'snapchat', label: 'Snapchat', region: 'global' },
  { value: 'reddit', label: 'Reddit', region: 'global' },
  { value: 'twitch', label: 'Twitch', region: 'global' },
  { value: 'other', label: 'Other / 其他', region: 'other' },
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

interface UsageState { evaluateUsed: boolean; generateUsed: boolean; evaluateCount: number; generateCount: number }

// ===================== MAIN APP =====================

export default function Home() {
  const [view, setView] = useState<AppView>('home')
  const [mode, setMode] = useState<'evaluate' | 'generate'>('evaluate')
  const [fingerprint, setFingerprint] = useState('')
  const [usage, setUsage] = useState<UsageState>({ evaluateUsed: false, generateUsed: false, evaluateCount: 0, generateCount: 0 })
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

  useEffect(() => { setFingerprint(getOrCreateFingerprint()) }, [])
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

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/usage?fingerprint=${fingerprint}`)
      if (res.ok) { const d = await res.json(); setUsage({ evaluateUsed: d.evaluateUsed, generateUsed: d.generateUsed, evaluateCount: d.evaluateCount, generateCount: d.generateCount }) }
    } catch {}
  }

  const handleShare = useCallback(() => {
    const text = `My name score is ${evalResult?.overallScore || '??'}! Test yours at NameVibe 🔥`
    const url = window.location.href
    if (navigator.share) { navigator.share({ title: 'NameVibe', text, url }).catch(() => {}) }
    else { navigator.clipboard.writeText(`${text} ${url}`).then(() => alert('Link copied!')).catch(() => {}) }
  }, [evalResult])

  const handleEvaluate = async () => {
    if (!nameInput.trim()) { setNameError('Enter a name first'); return }
    setNameError('')
    setIsLoading(true); setView('evaluating')
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), birthDate, bazi: baziData?.baziBrief || '', birthPlace, platform, fingerprint }),
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
        body: JSON.stringify({ bazi: baziData?.baziBrief || '', birthPlace, platform, requirements: specialRequirements, lockedWords, fingerprint }),
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
        body: JSON.stringify({ name, fingerprint }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setEvalResult({ overallScore: 0, summary: '🔒 Free attempts exhausted — deeper analysis requires unlock', nameInterpretation: `You selected "${name}". Deeper analysis is sealed.`, ambiguityCheck: '🔒 Locked', yiXueScore: 0, onlineUsageAnalysis: '🔒 Locked', influencerLevel: 0, acceptanceLevel: 0, viralPotential: '🔒 Locked', renameSuggestions: '🔒 Locked' })
      } else { setEvalResult(data.data || data) }
    } catch { setView('home') }
    finally { setIsLoading(false); fetchUsage() }
  }, [fingerprint])

  const handleBack = useCallback(() => { setView('home'); setEvalResult(null); setGenResult(null); setSelectedName(null) }, [])

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
            <span className="text-white font-bold text-lg tracking-tight">NameVibe</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/10 text-white/40 text-[10px] px-1.5">v1.0.1</Badge>
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
                      Your Name,{' '}
                      <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                        Your Vibe
                      </span>
                    </h1>
                    <p className="text-white/40 text-sm mt-2">Decode the hidden energy behind any online name ✨</p>
                  </motion.div>

                  {/* Mode Toggle */}
                  <motion.div className="mt-5 flex bg-white/5 rounded-2xl p-1 gap-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <button
                      onClick={() => setMode('evaluate')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${mode === 'evaluate' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Star className="w-3.5 h-3.5" /> Rate My Name
                    </button>
                    <button
                      onClick={() => setMode('generate')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${mode === 'generate' ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                      <Zap className="w-3.5 h-3.5" /> Generate Name
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
                          <Label className="text-white/60 text-xs font-medium">Online Name *</Label>
                          <Input
                            value={nameInput}
                            onChange={(e) => { setNameInput(e.target.value); if (nameError) setNameError('') }}
                            placeholder="Enter the name you go by online..."
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl"
                          />
                          {nameError && <p className="text-pink-400 text-xs">{nameError}</p>}
                        </div>
                      )}

                      {/* Birth Date + Calendar Type */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                          <Globe className="w-3 h-3" /> Birth Date
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
                                  {ct.icon} {ct.zh}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Birth Time */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Birth Time <span className="text-white/30">(optional)</span>
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
                              <span className="text-violet-400 text-xs font-semibold">⚡ Auto-Generated Bazi</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'Year', val: baziData.yearPillar },
                                { label: 'Month', val: baziData.monthPillar },
                                { label: 'Day', val: baziData.dayPillar },
                                { label: 'Hour', val: baziData.hourPillar },
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
                                <span className="text-pink-400/60">Missing: {baziData.missingElements.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && (
                        <div className="flex items-center gap-2 text-white/30 text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" /> Calculating bazi...
                        </div>
                      )}

                      {/* Birth Place */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium">Birth Place <span className="text-white/30">(optional)</span></Label>
                        <Input
                          value={birthPlace}
                          onChange={(e) => setBirthPlace(e.target.value)}
                          placeholder="e.g. Beijing, Tokyo, New York..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 h-11 rounded-xl"
                        />
                      </div>

                      {/* Platform */}
                      <div className="space-y-1.5">
                        <Label className="text-white/60 text-xs font-medium">Main Platform <span className="text-white/30">(optional)</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-xl">
                            <SelectValue placeholder="Select your platform" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-white/10 rounded-xl max-h-64">
                            <div className="px-2 py-1.5 text-[10px] text-white/30 font-semibold uppercase tracking-wider">🇨🇳 China</div>
                            {PLATFORMS.filter(p => p.region === 'cn').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{p.label}</SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-[10px] text-white/30 font-semibold uppercase tracking-wider mt-1">🌍 Global</div>
                            {PLATFORMS.filter(p => p.region === 'global').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{p.label}</SelectItem>
                            ))}
                            {PLATFORMS.filter(p => p.region === 'other').map(p => (
                              <SelectItem key={p.value} value={p.value} className="text-white/80 focus:bg-white/10 focus:text-white">{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only fields */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs font-medium">Special Requirements <span className="text-white/30">(optional)</span></Label>
                            <Textarea
                              value={specialRequirements}
                              onChange={(e) => setSpecialRequirements(e.target.value)}
                              placeholder="e.g. Cyberpunk vibe, 3 chars max, poetic feel..."
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:border-pink-500/50 focus-visible:ring-pink-500/20 min-h-[72px] rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-white/60 text-xs font-medium">Lock Words <span className="text-white/30">(must include)</span></Label>
                            <Input
                              value={lockedWords}
                              onChange={(e) => setLockedWords(e.target.value)}
                              placeholder='e.g. must contain "moon"'
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
                          {mode === 'evaluate' ? <><Star className="w-4 h-4" /> Analyze Vibe</> : <><Zap className="w-4 h-4" /> Generate Names</>}
                        </span>
                      </Button>

                      {/* Usage indicator */}
                      <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
                        <span>Rating: {Math.max(0, 1 - usage.evaluateCount)}/1 free</span>
                        <span>·</span>
                        <span>Generate: {Math.max(0, 1 - usage.generateCount)}/1 free</span>
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
                      {view === 'evaluating' ? 'Analyzing vibes...' : 'Generating names...'}
                    </p>
                    <p className="text-white/30 text-sm mt-1">
                      {view === 'evaluating' ? 'Decoding the hidden energy of your name' : 'Finding names that match your destiny'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* EVAL RESULT */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <EvalResultCard result={evalResult} onShare={handleShare} />
              </motion.div>
            )}

            {/* GEN RESULT */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <GenResultCard result={genResult} onNameSelect={handleNameSelect} />
              </motion.div>
            )}

            {/* GEN EVAL RESULT */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <Button onClick={handleBack} variant="ghost" className="text-white/40 hover:text-white hover:bg-white/5 gap-1.5 mb-4 -ml-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                {selectedName && (
                  <div className="text-center mb-5">
                    <p className="text-white/30 text-xs">Selected name</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent mt-1">{selectedName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    <p className="text-white/40 text-sm">Evaluating selected name...</p>
                  </div>
                ) : evalResult && <EvalResultCard result={evalResult} onShare={handleShare} />}
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
            <span className="text-white/20 text-xs">NameVibe · For entertainment only</span>
          </div>
          <p className="text-white/10 text-[10px]">AI-powered analysis · Not scientific advice</p>
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
            <DialogTitle className="text-center text-xl font-bold">No More Free Attempts</DialogTitle>
            <DialogDescription className="text-center text-white/40 mt-1">Share with friends to unlock more</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center"><p className="text-2xl font-bold text-violet-400">{usage.evaluateCount}</p><p className="text-white/30 text-[10px]">Ratings</p></div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center"><p className="text-2xl font-bold text-pink-400">{usage.generateCount}</p><p className="text-white/30 text-[10px]">Generations</p></div>
            </div>
            <Button onClick={handleShare} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-xl h-10">
              <Share2 className="w-4 h-4 mr-1.5" /> Share to Unlock
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPaywall(false)} className="text-white/30 hover:text-white/60 hover:bg-white/5 mx-auto">Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== EVAL RESULT CARD ===================

function EvalResultCard({ result, onShare }: { result: any; onShare: () => void }) {
  const score = result.overallScore || 0
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  const scoreColor = score < 40 ? '#f43f5e' : score <= 70 ? '#f59e0b' : '#8b5cf6'

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
              <span className="text-white/30 text-[10px] tracking-wider">OVERALL</span>
            </div>
          </div>
          {result.summary && <p className="text-white/50 text-sm mt-4 leading-relaxed max-w-xs mx-auto">{result.summary}</p>}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Yi-Xue', value: result.yiXueScore, icon: Star },
          { label: 'Viral', value: result.influencerLevel, icon: TrendingUp },
          { label: 'Accept', value: result.acceptanceLevel, icon: Heart },
        ].map(m => (
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
      {[
        { icon: Eye, title: 'Name Interpretation', content: result.nameInterpretation },
        { icon: Shield, title: 'Red Flag Check', content: result.ambiguityCheck },
        { icon: Users, title: 'Online Presence', content: result.onlineUsageAnalysis },
        { icon: Flame, title: 'Viral Potential', content: result.viralPotential, highlight: true },
        { icon: Pen, title: 'Rename Suggestions', content: result.renameSuggestions },
      ].filter(s => s.content && s.content !== '🔒 Locked').map((section, i) => (
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
          <Share2 className="w-4 h-4 mr-1.5" /> Share My Score
        </Button>
      </motion.div>
    </div>
  )
}

// =================== GEN RESULT CARD ===================

function GenResultCard({ result, onNameSelect }: { result: any; onNameSelect: (name: string) => void }) {
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
            <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-violet-400" /><CardTitle className="text-sm font-semibold text-white/60">Yi-Xue Analysis</CardTitle></div>
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
            <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-violet-400" /><CardTitle className="text-sm font-semibold text-white/60">Suggested Industries</CardTitle></div>
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
            <span className="text-white/50 text-sm font-semibold">Top 5 Picks</span>
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
                    'border-white/[0.06] hover:border-white/10'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-lg font-bold text-white">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-base">{nameItem.name}</h4>
                            <p className="text-white/40 text-xs line-clamp-1">{nameItem.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-white/10 text-white/40 text-[10px]">{nameItem.style}</Badge>
                          <div className={`text-sm font-bold ${nameItem.score >= 80 ? 'text-violet-400' : nameItem.score >= 60 ? 'text-amber-400' : 'text-pink-400'}`}>
                            {nameItem.score}
                          </div>
                        </div>
                      </div>
                      {isConfirming && !isSelected && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                          <Button size="sm" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold rounded-lg h-8">
                            Tap again to confirm → Full evaluation
                          </Button>
                        </motion.div>
                      )}
                      {isSelected && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                          <div className="flex items-center gap-1.5 text-violet-400 text-xs font-medium">
                            <Check className="w-3.5 h-3.5" /> Selected — evaluating...
                          </div>
                        </motion.div>
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
