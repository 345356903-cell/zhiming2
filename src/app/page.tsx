'use client'

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Star, Loader2, Languages, HelpCircle, ArrowLeft, Share2 } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import { type Lang, t } from '@/lib/i18n'

// ─── Constants ────────────────────────────────────────────────────────
const PLATFORMS = [
  { v: 'wechat', zh: '微信', en: 'WeChat', r: 'cn' },
  { v: 'douyin', zh: '抖音', en: 'Douyin', r: 'cn' },
  { v: 'xiaohongshu', zh: '小红书', en: 'RED', r: 'cn' },
  { v: 'weibo', zh: '微博', en: 'Weibo', r: 'cn' },
  { v: 'bilibili', zh: 'B站', en: 'Bilibili', r: 'cn' },
  { v: 'qq', zh: 'QQ', en: 'QQ', r: 'cn' },
  { v: 'tiktok', zh: 'TikTok', en: 'TikTok', r: 'global' },
  { v: 'instagram', zh: 'Instagram', en: 'Instagram', r: 'global' },
  { v: 'twitter', zh: 'X / Twitter', en: 'X / Twitter', r: 'global' },
  { v: 'youtube', zh: 'YouTube', en: 'YouTube', r: 'global' },
  { v: 'discord', zh: 'Discord', en: 'Discord', r: 'global' },
  { v: 'threads', zh: 'Threads', en: 'Threads', r: 'global' },
  { v: 'snapchat', zh: 'Snapchat', en: 'Snapchat', r: 'global' },
  { v: 'reddit', zh: 'Reddit', en: 'Reddit', r: 'global' },
  { v: 'twitch', zh: 'Twitch', en: 'Twitch', r: 'global' },
  { v: 'other', zh: '其他', en: 'Other', r: 'other' },
]
const YEARS = Array.from({ length: new Date().getFullYear() - 1940 + 1 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const STYLE_TAGS_ZH = ['赛博朋克', '古风诗意', '清新自然', '酷飒个性', '可爱甜美', '文艺知性', '极简高级', '搞笑沙雕', '英文混搭']
const STYLE_TAGS_EN = ['Cyberpunk', 'Classical', 'Fresh', 'Edgy', 'Cute', 'Literary', 'Minimal', 'Funny', 'English Mix']
const STYLE_EMOJIS = ['🎮', '🏯', '🌿', '⚡', '🍬', '📚', '◻️', '🤣', '🔤']

// Theme palettes
const DARK = {
  bg: '#000', card: '#1C1C1E', elevated: '#2C2C2E', sep: '#38383A',
  accent: '#C9A55C', accentGlow: 'rgba(201,165,92,0.03)',
  t1: '#F5F5F7', t2: '#86868B', t3: '#48484A',
  shadow: '0 2px 20px rgba(0,0,0,0.22)', shadowLg: '0 8px 40px rgba(0,0,0,0.35)',
  inset: 'inset 0 0 0 0.5px rgba(255,255,255,0.06)',
  headerBg: 'rgba(0,0,0,0.72)', headerBorder: 'rgba(255,255,255,0.08)',
  btnBg: 'rgba(255,255,255,0.06)', baziBg: 'rgba(0,0,0,0.25)',
}
const LIGHT = {
  bg: '#F5F5F7', card: '#FFF', elevated: '#F0F0F2', sep: '#D2D2D7',
  accent: '#B08930', accentGlow: 'rgba(176,137,48,0.04)',
  t1: '#1D1D1F', t2: '#6E6E73', t3: '#AEAEB2',
  shadow: '0 2px 20px rgba(0,0,0,0.08)', shadowLg: '0 8px 40px rgba(0,0,0,0.10)',
  inset: 'inset 0 0 0 0.5px rgba(0,0,0,0.06)',
  headerBg: 'rgba(245,245,247,0.72)', headerBorder: 'rgba(0,0,0,0.06)',
  btnBg: 'rgba(0,0,0,0.04)', baziBg: 'rgba(0,0,0,0.04)',
}
type C = typeof DARK
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
const EASE = [0.16, 1, 0.3, 1] as const

// ─── Helpers ──────────────────────────────────────────────────────────
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }
function verdict(s: number, l: Lang) {
  if (s >= 90) return t('verdictGodTier', l)
  if (s >= 75) return t('verdictGreat', l)
  if (s >= 55) return t('verdictDecent', l)
  if (s >= 35) return t('verdictMeh', l)
  return t('verdictDanger', l)
}

// ─── Hooks ────────────────────────────────────────────────────────────
function useSystemTheme() {
  return useSyncExternalStore(
    (cb) => { const mq = window.matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb) },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    () => 'dark',
  )
}

function useFingerprint() {
  const getFp = useCallback(() => {
    if (typeof window === 'undefined') return ''
    let stored = localStorage.getItem('zm_fp')
    if (!stored) {
      const raw = [navigator.userAgent, navigator.language, screen.width, screen.colorDepth, new Date().getTimezoneOffset()].join('|')
      let h = 0; for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h &= h }
      stored = 'fp_' + Math.abs(h).toString(36) + '_' + Date.now().toString(36)
      localStorage.setItem('zm_fp', stored)
    }
    return stored
  }, [])
  return useSyncExternalStore(
    useCallback((cb: () => void) => { window.addEventListener('storage', cb); return () => window.removeEventListener('storage', cb) }, []),
    getFp,
    () => '',
  )
}

interface BaziData { baziBrief: string; yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string; shengxiao: string; xingzuo: string; missingElements: string[] }

function useBazi() {
  const [data, setData] = useState<BaziData | null>(null)
  const [loading, setLoading] = useState(false)
  const calc = useCallback(async (birthDate: string, birthTime: string, calType: string) => {
    if (!birthDate) { setData(null); return }
    setLoading(true)
    try {
      const res = await fetch('/api/bazi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate, birthTime, calendarType: calType }) })
      const d = await res.json()
      if (d.success) { setData(d.data) } else { setData(null) }
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [])
  return { data, loading, calc }
}

// ─── Types ────────────────────────────────────────────────────────────
type View = 'home' | 'evaluating' | 'eval-result' | 'generating' | 'gen-result' | 'gen-eval-result'
interface Usage { evalCount: number; genCount: number; evalLimit: number; genLimit: number; evalUsed: boolean; genUsed: boolean; shareCount: number; streak: number; secondsUntilReset: number }

// ─── App ──────────────────────────────────────────────────────────────
export default function Home() {
  const theme = useSystemTheme()
  const C: C = theme === 'dark' ? DARK : LIGHT
  const isDark = theme === 'dark'
  const fp = useFingerprint()

  // Lang
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => {
    const stored = localStorage.getItem('zm_lang') as Lang | null
    if (stored === 'zh' || stored === 'en') setLang(stored)
    else if (!navigator.language?.toLowerCase().startsWith('zh')) setLang('en')
  }, [])

  // View & mode
  const [view, setView] = useState<View>('home')
  const [mode, setMode] = useState<'evaluate' | 'generate'>('evaluate')

  // Form state
  const [nameInput, setNameInput] = useState('')
  const [birthYear, setBirthYear] = useState(new Date().getFullYear())
  const [birthMonth, setBirthMonth] = useState(new Date().getMonth() + 1)
  const [birthDay, setBirthDay] = useState(new Date().getDate())
  const [birthTime, setBirthTime] = useState('')
  const [calType, setCalType] = useState('solar')
  const [birthPlace, setBirthPlace] = useState('')
  const [platform, setPlatform] = useState('')
  const [vibeInput, setVibeInput] = useState('')
  const [lockedWords, setLockedWords] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [vibeErr, setVibeErr] = useState('')

  // Results
  const [evalResult, setEvalResult] = useState<any>(null)
  const [genResult, setGenResult] = useState<any>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showManual, setShowManual] = useState(false)

  // Usage
  const [usage, setUsage] = useState<Usage>({ evalCount: 0, genCount: 0, evalLimit: 5, genLimit: 5, evalUsed: false, genUsed: false, shareCount: 0, streak: 0, secondsUntilReset: 0 })

  // Bazi
  const { data: baziData, loading: baziLoading, calc: calcBazi } = useBazi()
  const birthDate = useMemo(() => `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`, [birthYear, birthMonth, birthDay])
  const maxDay = useMemo(() => daysInMonth(birthYear, birthMonth), [birthYear, birthMonth])
  useEffect(() => { if (birthDay > maxDay) setBirthDay(maxDay) }, [maxDay, birthDay])

  // Auto bazi on date change
  useEffect(() => {
    const timer = setTimeout(() => calcBazi(birthDate, birthTime || '12:00', calType), 600)
    return () => clearTimeout(timer)
  }, [birthDate, birthTime, calType, calcBazi])

  // Fetch usage
  const fetchUsage = useCallback(async () => {
    if (!fp) return
    try {
      const res = await fetch(`/api/usage?fingerprint=${fp}`)
      if (res.ok) { const d = await res.json(); setUsage({ evalCount: d.evaluateCount, genCount: d.generateCount, evalLimit: d.evalLimit, genLimit: d.genLimit, evalUsed: d.evaluateUsed, genUsed: d.generateUsed, shareCount: d.shareCount, streak: d.streak, secondsUntilReset: d.secondsUntilReset }) }
    } catch {}
  }, [fp])
  useEffect(() => { fetchUsage() }, [fetchUsage])

  // Handlers
  const toggleLang = useCallback(() => setLang(p => { const n = p === 'zh' ? 'en' : 'zh'; localStorage.setItem('zm_lang', n); return n }), [])

  const doEvaluate = useCallback(async (name: string) => {
    const res = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, birthDate, bazi: baziData?.baziBrief || '', birthPlace, platform, fingerprint: fp, lang }) })
    return res
  }, [birthDate, baziData, birthPlace, platform, fp, lang])

  const handleEvaluate = async () => {
    if (!nameInput.trim()) { setNameErr(t('onlineNameRequired', lang)); return }
    setNameErr(''); setLoading(true); setView('evaluating')
    try {
      const res = await doEvaluate(nameInput.trim())
      if (res.status === 429) { setShowPaywall(true); setView('home'); return }
      const d = await res.json(); setEvalResult(d.data || d); setView('eval-result')
    } catch { setView('home') }
    finally { setLoading(false); fetchUsage() }
  }

  const handleGenerate = async () => {
    if (!vibeInput.trim()) { setVibeErr(t('styleRequired', lang)); return }
    setVibeErr(''); setLoading(true); setView('generating')
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bazi: baziData?.baziBrief || '', birthPlace, platform, requirements: vibeInput, lockedWords, fingerprint: fp, lang }) })
      if (res.status === 429) { setShowPaywall(true); setView('home'); return }
      const d = await res.json(); setGenResult(d.data || d); setView('gen-result')
    } catch { setView('home') }
    finally { setLoading(false); fetchUsage() }
  }

  const handleNameSelect = useCallback(async (name: string) => {
    setSelectedName(name); setView('gen-eval-result'); setLoading(true)
    try {
      const res = await doEvaluate(name)
      if (res.status === 429) { setEvalResult({ overallScore: 0, summary: t('lockedContent', lang), nameInterpretation: `${lang === 'zh' ? '你选择了' : 'You selected'} "${name}"`, ambiguityCheck: t('locked', lang), yiXueScore: 0, onlineUsageAnalysis: '', influencerLevel: 0, acceptanceLevel: 0, viralPotential: '', renameSuggestions: t('locked', lang) }) }
      else { const d = await res.json(); setEvalResult(d.data || d) }
    } catch { setView('home') }
    finally { setLoading(false); fetchUsage() }
  }, [doEvaluate, lang, fetchUsage])

  const handleShare = useCallback(async () => {
    const score = evalResult?.overallScore || '??'
    const name = evalResult?.name || nameInput || '??'
    const text = t('shareText', lang, { score, name })
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: 'ZhiMing', text, url }) } catch {} }
    else { await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {}) }
    try {
      const res = await fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fingerprint: fp }) })
      if (res.ok) { const d = await res.json(); setUsage(p => ({ ...p, shareCount: d.shareCount ?? p.shareCount, evalLimit: d.evalLimit ?? p.evalLimit, genLimit: d.genLimit ?? p.genLimit, evalUsed: d.evaluateUsed ?? p.evalUsed, genUsed: d.generateUsed ?? p.genUsed })) }
    } catch {}
    alert(t('linkCopied', lang))
  }, [evalResult, nameInput, fp, lang])

  const goBack = useCallback(() => { setView('home'); setEvalResult(null); setGenResult(null); setSelectedName(null) }, [])

  const pLabel = (p: typeof PLATFORMS[0]) => lang === 'zh' ? p.zh : p.en
  const iS = { background: C.elevated, color: C.t1, fontFamily: FONT, boxShadow: C.inset }
  const btnPrimary = { background: C.accent, color: '#000', letterSpacing: '-0.01em' }

  // ─── Score Ring Component ─────────────────────────────────────────
  function ScoreRing({ score, label, sub, size = 80 }: { score: number; label?: string; sub?: string; size?: number }) {
    const r = (size - 8) / 2
    const circ = 2 * Math.PI * r
    const pct = score / 100
    return (
      <div className="flex flex-col items-center gap-1">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.sep} strokeWidth={4} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.accent} strokeWidth={4} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size, marginTop: -size }}>
          <span className="font-bold" style={{ color: C.t1, fontSize: size * 0.28 }}>{score}</span>
        </div>
        {label && <span className="text-[11px] font-medium" style={{ color: C.t2 }}>{label}</span>}
        {sub && <span className="text-[10px]" style={{ color: C.t3 }}>{sub}</span>}
      </div>
    )
  }

  // ─── Result Card Component ───────────────────────────────────────
  function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="rounded-[16px] p-4" style={{ background: C.elevated, boxShadow: C.inset }}>
        <div className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2" style={{ color: C.accent }}>{title}</div>
        {children}
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: C.bg, fontFamily: FONT }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: C.headerBg, backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: `0.5px solid ${C.headerBorder}` }}>
        <div className="max-w-[480px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-v11.png" alt="M" width={30} height={30} className="rounded-[8px]" priority />
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: C.t1 }}>{t('appName', lang)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setShowManual(true)} className="flex items-center justify-center w-[34px] h-[34px] rounded-full active:scale-[0.88] transition-all" style={{ background: C.btnBg, color: C.t2 }}><HelpCircle className="w-4 h-4" /></button>
            <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium active:scale-[0.88] transition-all min-h-[34px]" style={{ background: C.btnBg, color: C.t2 }}><Languages className="w-3.5 h-3.5" />{lang === 'zh' ? 'EN' : '中'}</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[480px] mx-auto px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">

            {/* ═══ HOME ═══ */}
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                {/* Hero */}
                <div className="text-center mb-8 pt-4">
                  <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: EASE }}>
                    <h1 className="text-[32px] font-bold tracking-tight" style={{ color: C.t1, lineHeight: 1.15 }}>{t('heroTitle1', lang)}<br /><span style={{ color: C.accent }}>{t('heroTitle2', lang)}</span></h1>
                    <p className="text-[14px] mt-3 font-light" style={{ color: C.t2, lineHeight: 1.6 }}>{t('heroSub', lang)}</p>
                  </motion.div>
                  {/* Segmented Control */}
                  <motion.div className="mt-7 mx-auto relative flex rounded-[12px] p-[3px]" style={{ background: C.card }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5, ease: EASE }}>
                    <motion.div className="absolute top-[3px] bottom-[3px] rounded-[10px]" style={{ background: C.elevated, boxShadow: C.shadow }} animate={{ left: mode === 'evaluate' ? '3px' : '50%', width: 'calc(50% - 4.5px)' }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    <button onClick={() => setMode('evaluate')} className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px]" style={{ color: mode === 'evaluate' ? C.t1 : C.t3 }}><Star className="w-3.5 h-3.5" />{t('rateMyName', lang)}</button>
                    <button onClick={() => setMode('generate')} className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px]" style={{ color: mode === 'generate' ? C.t1 : C.t3 }}><Zap className="w-3.5 h-3.5" />{t('generateName', lang)}</button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: EASE }}>
                  <Card className="rounded-[24px] overflow-hidden" style={{ background: C.card, border: 'none', boxShadow: C.shadow }}>
                    <CardContent className="p-6 space-y-6">
                      {/* Name (evaluate) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-2">
                          <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('onlineName', lang)} <span style={{ color: C.accent }}>*</span></Label>
                          <Input value={nameInput} onChange={e => { setNameInput(e.target.value); if (nameErr) setNameErr('') }} placeholder={t('onlineNamePlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={iS} />
                          {nameErr && <p className="text-[12px]" style={{ color: C.accent }}>{nameErr}</p>}
                        </div>
                      )}

                      {/* Birth Date */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('birthDate', lang)}</Label>
                          <div className="flex rounded-[9px] p-[2px] gap-[2px]" style={{ background: C.elevated }}>
                            <button onClick={() => setCalType('solar')} className="px-3 py-1 rounded-[7px] text-[11px] font-medium transition-all" style={calType === 'solar' ? { background: C.sep, color: C.t1 } : { color: C.t3 }}>{t('calendarSolar', lang)}</button>
                            <button onClick={() => setCalType('lunar')} className="px-3 py-1 rounded-[7px] text-[11px] font-medium transition-all" style={calType === 'lunar' ? { background: C.sep, color: C.t1 } : { color: C.t3 }}>{t('calendarLunar', lang)}</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { val: birthYear, set: setBirthYear, items: YEARS, suffix: '' },
                            { val: birthMonth, set: setBirthMonth, items: MONTHS, suffix: lang === 'zh' ? '月' : '' },
                            { val: birthDay, set: setBirthDay, items: Array.from({ length: maxDay }, (_, i) => i + 1), suffix: lang === 'zh' ? '日' : '' },
                          ].map((col, i) => (
                            <Select key={i} value={String(col.val)} onValueChange={v => col.set(Number(v))}>
                              <SelectTrigger className="h-12 rounded-2xl text-[15px] border-0" style={iS}><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-2xl max-h-48" style={{ background: C.elevated, border: 'none', boxShadow: C.shadowLg }}>
                                {col.items.map(v => <SelectItem key={v} value={String(v)} className="text-[14px]" style={{ color: C.t2 }}>{v}{col.suffix}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-[12px] shrink-0" style={{ color: C.t3 }}>{t('birthTime', lang)}</Label>
                          <Input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} className="h-9 rounded-xl text-[13px] flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0" style={{ ...iS, colorScheme: isDark ? 'dark' : 'light' }} />
                        </div>
                      </div>

                      {/* Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                          <div className="rounded-[20px] p-5" style={{ background: `linear-gradient(135deg, ${C.accentGlow}, transparent)`, boxShadow: 'inset 0 0 0 0.5px rgba(212,169,106,0.08)' }}>
                            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-4" style={{ color: C.accent }}>{t('autoBazi', lang)}</div>
                            <div className="grid grid-cols-4 gap-2.5 text-center">
                              {[t('year', lang), t('month', lang), t('day', lang), t('hour', lang)].map((label, i) => (
                                <div key={label} className="rounded-[14px] py-2.5" style={{ background: C.baziBg }}>
                                  <div className="font-bold text-[16px]" style={{ color: C.t1 }}>{[baziData.yearPillar, baziData.monthPillar, baziData.dayPillar, baziData.hourPillar][i]}</div>
                                  <div className="text-[10px] mt-1 font-medium" style={{ color: C.t3 }}>{label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[11px]" style={{ color: C.t3 }}>
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && <span style={{ color: `${C.accent}90` }}>{t('missing', lang)}{baziData.missingElements.join(', ')}</span>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && <div className="flex items-center gap-2.5 text-[12px]" style={{ color: C.t3 }}><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('calculatingBazi', lang)}</div>}

                      {/* Birth Place */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('birthPlace', lang)} <span style={{ color: C.t3 }}>({t('optional', lang)})</span></Label>
                        <Input value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder={t('birthPlacePlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={iS} />
                      </div>

                      {/* Platform */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('mainPlatform', lang)} <span style={{ color: C.t3 }}>({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="h-12 rounded-2xl text-[15px] border-0" style={iS}><SelectValue placeholder={t('selectPlatform', lang)} /></SelectTrigger>
                          <SelectContent className="rounded-2xl max-h-56" style={{ background: C.elevated, border: 'none', boxShadow: C.shadowLg }}>
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.t3 }}>{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.r === 'cn').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px]" style={{ color: C.t2 }}>{pLabel(p)}</SelectItem>)}
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] mt-1" style={{ color: C.t3 }}>{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.r === 'global').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px]" style={{ color: C.t2 }}>{pLabel(p)}</SelectItem>)}
                            {PLATFORMS.filter(p => p.r === 'other').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px]" style={{ color: C.t2 }}>{pLabel(p)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only: Vibe + Lock Words */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('specialRequirements', lang)} <span style={{ color: C.accent }}>*</span></Label>
                            <Textarea value={vibeInput} onChange={e => { setVibeInput(e.target.value); if (vibeErr) setVibeErr('') }} placeholder={t('specialRequirementsPlaceholder', lang)} className="min-h-[80px] rounded-2xl text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={iS} />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(lang === 'zh' ? STYLE_TAGS_ZH : STYLE_TAGS_EN).map((label, i) => (
                                <button key={label} onClick={() => { const cur = vibeInput.trim(); setVibeInput(cur ? `${cur} ${label}` : label); if (vibeErr) setVibeErr('') }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium active:scale-[0.92] transition-all" style={{ background: vibeInput.includes(label) ? `${C.accent}18` : C.elevated, color: vibeInput.includes(label) ? C.accent : C.t3, boxShadow: C.inset }}>
                                  <span className="text-[10px]">{STYLE_EMOJIS[i]}</span> {label}
                                </button>
                              ))}
                            </div>
                            {vibeErr && <p className="text-[12px]" style={{ color: C.accent }}>{vibeErr}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium" style={{ color: C.t1 }}>{t('lockWords', lang)} <span style={{ color: C.t3 }}>({t('optional', lang)})</span></Label>
                            <Input value={lockedWords} onChange={e => setLockedWords(e.target.value)} placeholder={t('lockWordsPlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-[#AEAEB2] focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={iS} />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <button onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate} className="w-full h-[52px] text-[16px] font-semibold rounded-[14px] active:scale-[0.97] transition-all border-0" style={btnPrimary}>
                        {mode === 'evaluate' ? <span className="flex items-center justify-center gap-2.5"><Star className="w-[17px] h-[17px]" />{t('analyzeVibe', lang)}</span> : <span className="flex items-center justify-center gap-2.5"><Zap className="w-[17px] h-[17px]" />{t('generateNames', lang)}</span>}
                      </button>

                      {/* Usage */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-center gap-4 text-[12px]" style={{ color: C.t3 }}>
                          <span>{t('rating', lang)}: {usage.evalCount}/{usage.evalLimit}</span>
                          <span style={{ color: C.sep }}>·</span>
                          <span>{t('generation', lang)}: {usage.genCount}/{usage.genLimit}</span>
                        </div>
                        <div className="text-center text-[11px]" style={{ color: C.t3 }}>{t('dailyReset', lang)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ EVALUATING / GENERATING ═══ */}
            {(view === 'evaluating' || view === 'generating') && (
              <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: C.accent, animation: 'spin 1s linear infinite' }} />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent" style={{ borderBottomColor: C.accent, opacity: 0.4, animation: 'spin 1.5s linear infinite reverse' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {view === 'evaluating' ? <Star className="w-7 h-7" style={{ color: C.accent }} /> : <Zap className="w-7 h-7" style={{ color: C.accent }} />}
                  </div>
                </div>
                <p className="text-[17px] font-semibold" style={{ color: C.t1 }}>{view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}</p>
                <p className="text-[13px] mt-2" style={{ color: C.t2 }}>{view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}</p>
              </motion.div>
            )}

            {/* ═══ EVAL RESULT ═══ */}
            {view === 'eval-result' && evalResult && (
              <motion.div key="eval-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={goBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium active:scale-[0.95] transition-all" style={{ color: C.accent }}><ArrowLeft className="w-4 h-4" />{t('back', lang)}</button>

                {/* Verdict */}
                <div className="text-center mb-6">
                  <div className="text-[24px] font-bold mb-2" style={{ color: C.t1 }}>{verdict(evalResult.overallScore, lang)}</div>
                  <div className="flex justify-center"><ScoreRing score={evalResult.overallScore} label={t('overall', lang)} size={100} /></div>
                </div>

                {/* Score Breakdown */}
                <div className="flex justify-center gap-6 mb-6">
                  <ScoreRing score={evalResult.yiXueScore} label={t('scoreBazi', lang)} size={72} />
                  <ScoreRing score={evalResult.influencerLevel} label={t('scoreSpread', lang)} size={72} />
                  <ScoreRing score={evalResult.acceptanceLevel} label={t('scorePopularity', lang)} size={72} />
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  <SectionCard title={t('nameInterpretation', lang)}><div className="text-[14px] leading-relaxed" style={{ color: C.t2 }}><ReactMarkdown>{evalResult.nameInterpretation || ''}</ReactMarkdown></div></SectionCard>
                  <SectionCard title={t('redFlagCheck', lang)}><div className="text-[14px]" style={{ color: C.t2 }}>{evalResult.ambiguityCheck}</div></SectionCard>
                  <SectionCard title={t('onlinePresence', lang)}><div className="text-[14px]" style={{ color: C.t2 }}>{evalResult.onlineUsageAnalysis}</div></SectionCard>
                  <SectionCard title={t('viralPotential', lang)}><div className="text-[14px]" style={{ color: C.t2 }}>{evalResult.viralPotential}</div></SectionCard>
                  <SectionCard title={t('renameSuggestions', lang)}><div className="text-[14px] leading-relaxed" style={{ color: C.t2 }}><ReactMarkdown>{evalResult.renameSuggestions || ''}</ReactMarkdown></div></SectionCard>
                </div>

                {/* Share */}
                <div className="mt-6 flex justify-center">
                  <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold active:scale-[0.95] transition-all" style={{ background: C.btnBg, color: C.t1, boxShadow: C.inset }}><Share2 className="w-4 h-4" />{t('shareMyScore', lang)}</button>
                </div>
              </motion.div>
            )}

            {/* ═══ GENERATE RESULT ═══ */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={goBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium active:scale-[0.95] transition-all" style={{ color: C.accent }}><ArrowLeft className="w-4 h-4" />{t('back', lang)}</button>

                {/* Analysis */}
                <SectionCard title={t('yiXueAnalysis', lang)}><div className="text-[14px] leading-relaxed" style={{ color: C.t2 }}><ReactMarkdown>{genResult.yiXueAnalysis || ''}</ReactMarkdown></div></SectionCard>
                <SectionCard title={t('suggestedIndustries', lang)}><div className="text-[14px]" style={{ color: C.t2 }}>{genResult.suggestedIndustries}</div></SectionCard>

                {/* Names */}
                <div className="mt-4 space-y-2.5">
                  <div className="text-[13px] font-semibold mb-3" style={{ color: C.t1 }}>{t('top5Picks', lang)}</div>
                  {genResult.names?.map((n: any, i: number) => (
                    <motion.div key={n.name || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }}>
                      <button onClick={() => handleNameSelect(n.name)} className="w-full text-left rounded-[16px] p-4 active:scale-[0.98] transition-all" style={{ background: C.elevated, boxShadow: C.inset }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[16px] font-semibold" style={{ color: C.t1 }}>{n.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${C.accent}15`, color: C.accent }}>{n.style}</span>
                            <span className="text-[14px] font-bold" style={{ color: C.accent }}>{n.score}{t('score', lang)}</span>
                          </div>
                        </div>
                        <div className="text-[13px]" style={{ color: C.t2 }}>{n.reason}</div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ GEN → EVAL RESULT ═══ */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={goBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium active:scale-[0.95] transition-all" style={{ color: C.accent }}><ArrowLeft className="w-4 h-4" />{t('back', lang)}</button>

                {loading ? (
                  <div className="flex flex-col items-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: C.accent }} />
                    <p className="text-[15px]" style={{ color: C.t2 }}>{t('evaluatingSelected', lang)}</p>
                    <p className="text-[13px] mt-1" style={{ color: C.t3 }}>{selectedName && `"${selectedName}"`}</p>
                  </div>
                ) : evalResult ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-[20px] font-bold mb-1" style={{ color: C.t1 }}>{selectedName}</div>
                      <div className="text-[24px] font-bold mb-2" style={{ color: C.t1 }}>{verdict(evalResult.overallScore, lang)}</div>
                      <div className="flex justify-center"><ScoreRing score={evalResult.overallScore} label={t('overall', lang)} size={100} /></div>
                    </div>
                    <div className="flex justify-center gap-6 mb-6">
                      <ScoreRing score={evalResult.yiXueScore} label={t('scoreBazi', lang)} size={72} />
                      <ScoreRing score={evalResult.influencerLevel} label={t('scoreSpread', lang)} size={72} />
                      <ScoreRing score={evalResult.acceptanceLevel} label={t('scorePopularity', lang)} size={72} />
                    </div>
                    <div className="space-y-3">
                      <SectionCard title={t('nameInterpretation', lang)}><div className="text-[14px] leading-relaxed" style={{ color: C.t2 }}><ReactMarkdown>{evalResult.nameInterpretation || ''}</ReactMarkdown></div></SectionCard>
                      <SectionCard title={t('redFlagCheck', lang)}><div className="text-[14px]" style={{ color: C.t2 }}>{evalResult.ambiguityCheck}</div></SectionCard>
                      <SectionCard title={t('renameSuggestions', lang)}><div className="text-[14px] leading-relaxed" style={{ color: C.t2 }}><ReactMarkdown>{evalResult.renameSuggestions || ''}</ReactMarkdown></div></SectionCard>
                    </div>
                    <div className="mt-6 flex justify-center">
                      <button onClick={handleShare} className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold active:scale-[0.95] transition-all" style={{ background: C.btnBg, color: C.t1, boxShadow: C.inset }}><Share2 className="w-4 h-4" />{t('shareMyScore', lang)}</button>
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto" style={{ background: C.bg }}>
        <div className="max-w-[480px] mx-auto px-6 py-5 flex flex-col items-center gap-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <Image src="/logo-v11.png" alt="" width={10} height={10} className="rounded-[3px] opacity-25" />
            <span className="text-[11px] font-light" style={{ color: C.t3 }}>{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-[10px] font-light" style={{ color: `${C.t3}66` }}>{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* Paywall Dialog */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-[340px] rounded-[24px]" style={{ background: C.card, border: 'none' }}>
          <DialogHeader>
            <DialogTitle className="text-center text-[18px]" style={{ color: C.t1 }}>{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center text-[14px]" style={{ color: C.t2 }}>{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-4 py-4">
            <div className="text-center"><div className="text-[24px] font-bold" style={{ color: C.accent }}>{usage.evalCount}/{usage.evalLimit}</div><div className="text-[12px]" style={{ color: C.t3 }}>{t('ratings', lang)}</div></div>
            <div className="text-center"><div className="text-[24px] font-bold" style={{ color: C.accent }}>{usage.genCount}/{usage.genLimit}</div><div className="text-[12px]" style={{ color: C.t3 }}>{t('generations', lang)}</div></div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <button onClick={() => { handleShare(); setShowPaywall(false) }} className="w-full h-[48px] rounded-[14px] text-[15px] font-semibold active:scale-[0.97] transition-all" style={btnPrimary}><Share2 className="w-4 h-4 inline mr-2" />{t('shareButton', lang)}</button>
            <button onClick={() => setShowPaywall(false)} className="w-full h-[40px] rounded-[12px] text-[14px] transition-all" style={{ color: C.t3 }}>{t('gotIt', lang)}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-[380px] max-h-[80vh] overflow-y-auto rounded-[24px]" style={{ background: C.card, border: 'none' }}>
          <DialogHeader><DialogTitle className="text-[18px]" style={{ color: C.t1 }}>{t('manualTitle', lang)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {[
              t('manualAboutTitle', lang), t('manualRateTitle', lang), t('manualGenTitle', lang),
              t('manualBaziTitle', lang), t('manualScoreTitle', lang), t('manualUsageTitle', lang),
            ].map((title, i) => (
              <div key={i}>
                <div className="text-[14px] font-semibold mb-1" style={{ color: C.t1 }}>{title}</div>
                <div className="text-[13px] leading-relaxed" style={{ color: C.t2 }}>
                  <ReactMarkdown>{[t('manualAboutContent', lang), t('manualRateContent', lang), t('manualGenContent', lang), t('manualBaziContent', lang), t('manualScoreContent', lang), t('manualUsageContent', lang)][i]}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter><button onClick={() => setShowManual(false)} className="w-full h-[44px] rounded-[14px] text-[15px] font-semibold active:scale-[0.97] transition-all" style={btnPrimary}>{t('manualClose', lang)}</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
