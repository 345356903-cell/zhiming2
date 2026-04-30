'use client'

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Star, Loader2, Languages, HelpCircle, ArrowLeft, Share2 } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { type Lang, t } from '@/lib/i18n'

const ReactMarkdown = lazy(() => import('react-markdown'))

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
] as const

const YEARS = Array.from({ length: new Date().getFullYear() - 1940 + 1 }, (_, i) => new Date().getFullYear() - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const STYLE_TAGS = { zh: ['赛博朋克', '古风诗意', '清新自然', '酷飒个性', '可爱甜美', '文艺知性', '极简高级', '搞笑沙雕', '英文混搭'], en: ['Cyberpunk', 'Classical', 'Fresh', 'Edgy', 'Cute', 'Literary', 'Minimal', 'Funny', 'English Mix'] }
const STYLE_EMOJIS = ['🎮', '🏯', '🌿', '⚡', '🍬', '📚', '◻️', '🤣', '🔤']
const EASE = [0.16, 1, 0.3, 1] as const

// ─── Types ────────────────────────────────────────────────────────────
type View = 'home' | 'evaluating' | 'eval-result' | 'generating' | 'gen-result' | 'gen-eval-result'
type Mode = 'evaluate' | 'generate'

interface BaziData { baziBrief: string; yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string; shengxiao: string; xingzuo: string; missingElements: string[] }
interface Usage { evalCount: number; genCount: number; evalLimit: number; genLimit: number; evalUsed: boolean; genUsed: boolean; shareCount: number; streak: number; secondsUntilReset: number }
interface EvalResult { overallScore: number; yiXueScore: number; influencerLevel: number; acceptanceLevel: number; nameInterpretation: string; ambiguityCheck: string; onlineUsageAnalysis: string; viralPotential: string; renameSuggestions: string; summary: string }
interface GenResult { yiXueAnalysis: string; suggestedIndustries: string; names: Array<{ name: string; score: number; reason: string; style: string }> }

// ─── Helpers ──────────────────────────────────────────────────────────
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
const verdict = (s: number, l: Lang) =>
  s >= 90 ? t('verdictGodTier', l) :
  s >= 75 ? t('verdictGreat', l) :
  s >= 55 ? t('verdictDecent', l) :
  s >= 35 ? t('verdictMeh', l) : t('verdictDanger', l)

const platformLabel = (p: typeof PLATFORMS[number], l: Lang) => l === 'zh' ? p.zh : p.en

// ─── Extracted Components (module-level for performance) ──────────────
function ScoreRing({ score, label, size = 120 }: { score: number; label?: string; size?: number }) {
  const strokeWidth = size >= 100 ? 5 : 4
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  // Color tier: gold (≥75), amber (≥45), muted (<45)
  const ringColor = score >= 75 ? 'var(--zm-accent)' : score >= 45 ? 'color-mix(in srgb, var(--zm-accent) 60%, var(--zm-sep))' : 'var(--zm-sep)'
  const fontSize = size >= 100 ? size * 0.26 : size * 0.28
  return (
    <div className="flex flex-col items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--zm-sep)" strokeWidth={strokeWidth} opacity={0.35} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeLinecap="round"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - score / 100) }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-bold tabular-nums" style={{ fontSize, color: 'var(--zm-t1)', lineHeight: 1 }}>{score}</span>
          <span className="text-[10px] font-medium" style={{ color: 'var(--zm-t3)', marginTop: 2 }}>{label || ''}</span>
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ score, label, icon, lang }: { score: number; label: string; icon?: React.ReactNode; lang?: Lang }) {
  const barColor = score >= 75 ? 'var(--zm-accent)' : score >= 45 ? 'color-mix(in srgb, var(--zm-accent) 50%, var(--zm-sep))' : 'var(--zm-sep)'
  const isZh = lang !== 'en'
  const barLabel = score >= 75 ? (isZh ? '吉' : 'Great') : score >= 45 ? (isZh ? '中' : 'Mid') : (isZh ? '弱' : 'Low')
  return (
    <div className="rounded-2xl p-3.5 bg-zm-elevated zm-inset">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[15px]">{icon}</span>
          <span className="text-[13px] font-semibold text-zm-t1">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--zm-accent-rgb),0.08)', color: 'var(--zm-accent)' }}>{barLabel}</span>
          <span className="text-[16px] font-bold tabular-nums text-zm-t1">{score}</span>
        </div>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--zm-sep) 40%, transparent)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        />
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 bg-zm-elevated zm-inset">
      <div className="text-[11px] font-semibold tracking-[0.06em] uppercase mb-2 text-zm-accent">{title}</div>
      {children}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Suspense fallback={<span className="text-zm-t2 text-[14px]">{content}</span>}>
      <div className="text-[14px] leading-relaxed text-zm-t2"><ReactMarkdown>{content}</ReactMarkdown></div>
    </Suspense>
  )
}

// ─── Unified Result View ──────────────────────────────────────────────
function ResultView({ result, selectedName, lang, onBack, onShare }: {
  result: EvalResult; selectedName?: string | null; lang: Lang;
  onBack: () => void; onShare: () => void;
}) {
  const showFull = !selectedName // full view for direct eval, compact for gen-eval
  return (
    <motion.div key={selectedName || 'eval'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium text-zm-accent active:scale-95 transition-all">
        <ArrowLeft className="w-4 h-4" />{t('back', lang)}
      </button>

      {selectedName && <div className="text-center text-[20px] font-bold mb-2 text-zm-t1">{selectedName}</div>}

      {/* ─── Overall Score Ring (standalone, no overlap) ─── */}
      <div className="flex flex-col items-center mb-2">
        <ScoreRing score={result.overallScore} label={t('overall', lang)} size={130} />
      </div>
      <div className="text-center mb-5">
        <span className="text-[20px] font-bold text-zm-t1">{verdict(result.overallScore, lang)}</span>
      </div>

      {/* ─── Sub Scores as Progress Bars (card-style) ─── */}
      <div className="space-y-2.5 mb-6">
        <ScoreBar score={result.yiXueScore} label={t('scoreBazi', lang)} icon={<span className="text-[15px]">🔮</span>} lang={lang} />
        <ScoreBar score={result.influencerLevel} label={t('scoreSpread', lang)} icon={<span className="text-[15px]">📡</span>} lang={lang} />
        <ScoreBar score={result.acceptanceLevel} label={t('scorePopularity', lang)} icon={<span className="text-[15px]">💝</span>} lang={lang} />
      </div>

      <div className="space-y-3">
        <SectionCard title={t('nameInterpretation', lang)}><MarkdownContent content={result.nameInterpretation || ''} /></SectionCard>
        <SectionCard title={t('redFlagCheck', lang)}><div className="text-[14px] text-zm-t2">{result.ambiguityCheck}</div></SectionCard>
        {showFull && <SectionCard title={t('onlinePresence', lang)}><div className="text-[14px] text-zm-t2">{result.onlineUsageAnalysis}</div></SectionCard>}
        {showFull && <SectionCard title={t('viralPotential', lang)}><div className="text-[14px] text-zm-t2">{result.viralPotential}</div></SectionCard>}
        <SectionCard title={t('renameSuggestions', lang)}><MarkdownContent content={result.renameSuggestions || ''} /></SectionCard>
      </div>

      <div className="mt-6 flex justify-center">
        <button onClick={onShare} className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold bg-zm-btn-bg text-zm-t1 zm-inset active:scale-95 transition-all">
          <Share2 className="w-4 h-4" />{t('shareMyScore', lang)}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Hooks ────────────────────────────────────────────────────────────
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

function useBazi() {
  const [data, setData] = useState<BaziData | null>(null)
  const [loading, setLoading] = useState(false)
  const calc = useCallback(async (birthDate: string, birthTime: string, calType: string) => {
    if (!birthDate) { setData(null); return }
    setLoading(true)
    try {
      const res = await fetch('/api/bazi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ birthDate, birthTime, calendarType: calType }) })
      const d = await res.json()
      setData(d.success ? d.data : null)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [])
  return { data, loading, calc }
}

// ─── App ──────────────────────────────────────────────────────────────
export default function Home() {
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
  const [mode, setMode] = useState<Mode>('evaluate')

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
  const [nameLength, setNameLength] = useState('any')
  const [nameErr, setNameErr] = useState('')
  const [vibeErr, setVibeErr] = useState('')

  // Results
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [genResult, setGenResult] = useState<GenResult | null>(null)
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
      if (res.ok) {
        const d = await res.json()
        setUsage({ evalCount: d.evaluateCount, genCount: d.generateCount, evalLimit: d.evalLimit, genLimit: d.genLimit, evalUsed: d.evaluateUsed, genUsed: d.generateUsed, shareCount: d.shareCount, streak: d.streak, secondsUntilReset: d.secondsUntilReset })
      }
    } catch { /* ignore */ }
  }, [fp])
  useEffect(() => { fetchUsage() }, [fetchUsage])

  // ─── Handlers ───────────────────────────────────────────────────
  const toggleLang = useCallback(() => setLang(p => { const n: Lang = p === 'zh' ? 'en' : 'zh'; localStorage.setItem('zm_lang', n); return n }), [])

  const doEvaluate = useCallback(async (name: string) => {
    return fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, birthDate, bazi: baziData?.baziBrief || '', birthPlace, platform, fingerprint: fp, lang }) })
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
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bazi: baziData?.baziBrief || '', birthPlace, platform, requirements: vibeInput, lockedWords, nameLength, fingerprint: fp, lang }) })
      if (res.status === 429) { setShowPaywall(true); setView('home'); return }
      const d = await res.json(); setGenResult(d.data || d); setView('gen-result')
    } catch { setView('home') }
    finally { setLoading(false); fetchUsage() }
  }

  const handleNameSelect = useCallback(async (name: string) => {
    setSelectedName(name); setView('gen-eval-result'); setLoading(true)
    try {
      const res = await doEvaluate(name)
      if (res.status === 429) {
        setEvalResult({ overallScore: 0, summary: t('lockedContent', lang), nameInterpretation: `${lang === 'zh' ? '你选择了' : 'You selected'} "${name}"`, ambiguityCheck: t('locked', lang), yiXueScore: 0, onlineUsageAnalysis: '', influencerLevel: 0, acceptanceLevel: 0, viralPotential: '', renameSuggestions: t('locked', lang) })
      } else { const d = await res.json(); setEvalResult(d.data || d) }
    } catch { setView('home') }
    finally { setLoading(false); fetchUsage() }
  }, [doEvaluate, lang, fetchUsage])

  const handleShare = useCallback(async () => {
    const score = evalResult?.overallScore ?? '??'
    const name = evalResult?.name || nameInput || '??'
    const text = t('shareText', lang, { score, name })
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: 'ZhiMing', text, url }) } catch { /* user cancelled */ } }
    else { await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {}) }
    try {
      const res = await fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fingerprint: fp }) })
      if (res.ok) { const d = await res.json(); setUsage(p => ({ ...p, shareCount: d.shareCount ?? p.shareCount, evalLimit: d.evalLimit ?? p.evalLimit, genLimit: d.genLimit ?? p.genLimit, evalUsed: d.evaluateUsed ?? p.evalUsed, genUsed: d.generateUsed ?? p.genUsed })) }
    } catch { /* ignore */ }
    alert(t('linkCopied', lang))
  }, [evalResult, nameInput, fp, lang])

  const goBack = useCallback(() => { setView('home'); setEvalResult(null); setGenResult(null); setSelectedName(null) }, [])

  // ─── Shared style objects (stable references) ───────────────────
  const inputStyle = { background: 'var(--zm-elevated)', color: 'var(--zm-t1)', fontFamily: 'var(--zm-font)', boxShadow: 'var(--zm-inset)' } as React.CSSProperties
  const btnPrimary = { background: 'var(--zm-accent)', color: '#000', letterSpacing: '-0.01em' } as React.CSSProperties

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col bg-zm-bg" style={{ fontFamily: 'var(--zm-font)' }}>

      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-50 zm-glass-header">
        <div className="max-w-[480px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-v8.png" alt="M" width={30} height={30} className="rounded-lg" priority />
            <span className="font-semibold text-[15px] tracking-tight text-zm-t1">{t('appName', lang)}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setShowManual(true)} className="flex items-center justify-center w-[34px] h-[34px] rounded-full active:scale-[0.88] transition-all bg-zm-btn-bg text-zm-t2">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium active:scale-[0.88] transition-all min-h-[34px] bg-zm-btn-bg text-zm-t2">
              <Languages className="w-3.5 h-3.5" />{lang === 'zh' ? 'EN' : '中'}
            </button>
          </div>
        </div>
      </header>

      {/* ═══ Main ═══ */}
      <main className="flex-1 relative z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-[480px] mx-auto px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">

            {/* ═══ HOME ═══ */}
            {view === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                {/* Hero */}
                <div className="text-center mb-8 pt-4">
                  <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.6, ease: EASE }}>
                    <h1 className="text-[32px] font-bold tracking-tight text-zm-t1" style={{ lineHeight: 1.15 }}>{t('heroTitle1', lang)}<br /><span className="text-zm-accent">{t('heroTitle2', lang)}</span></h1>
                    <p className="text-[14px] mt-3 font-light text-zm-t2" style={{ lineHeight: 1.6 }}>{t('heroSub', lang)}</p>
                  </motion.div>
                  {/* Segmented Control */}
                  <motion.div className="mt-7 mx-auto relative flex rounded-xl p-[3px] bg-zm-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5, ease: EASE }}>
                    <motion.div className="absolute top-[3px] bottom-[3px] rounded-[10px] bg-zm-elevated zm-card-shadow" animate={{ left: mode === 'evaluate' ? '3px' : '50%', width: 'calc(50% - 4.5px)' }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    <button onClick={() => setMode('evaluate')} className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px]" style={{ color: mode === 'evaluate' ? 'var(--zm-t1)' : 'var(--zm-t3)' }}><Star className="w-3.5 h-3.5" />{t('rateMyName', lang)}</button>
                    <button onClick={() => setMode('generate')} className="relative z-10 flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 min-h-[44px]" style={{ color: mode === 'generate' ? 'var(--zm-t1)' : 'var(--zm-t3)' }}><Zap className="w-3.5 h-3.5" />{t('generateName', lang)}</button>
                  </motion.div>
                </div>

                {/* Form Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: EASE }}>
                  <Card className="rounded-3xl overflow-hidden border-0 bg-zm-card zm-card-shadow">
                    <CardContent className="p-6 space-y-6">
                      {/* Name (evaluate mode) */}
                      {mode === 'evaluate' && (
                        <div className="space-y-2">
                          <Label className="text-[13px] font-medium text-zm-t1">{t('onlineName', lang)} <span className="text-zm-accent">*</span></Label>
                          <Input value={nameInput} onChange={e => { setNameInput(e.target.value); if (nameErr) setNameErr('') }} placeholder={t('onlineNamePlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-zm-t3 focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={inputStyle} />
                          {nameErr && <p className="text-[12px] text-zm-accent">{nameErr}</p>}
                        </div>
                      )}

                      {/* Birth Date */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] font-medium text-zm-t1">{t('birthDate', lang)}</Label>
                          <div className="flex rounded-[9px] p-[2px] gap-[2px] bg-zm-elevated">
                            <button onClick={() => setCalType('solar')} className="px-3 py-1 rounded-[7px] text-[11px] font-medium transition-all" style={calType === 'solar' ? { background: 'var(--zm-sep)', color: 'var(--zm-t1)' } : { color: 'var(--zm-t3)' }}>{t('calendarSolar', lang)}</button>
                            <button onClick={() => setCalType('lunar')} className="px-3 py-1 rounded-[7px] text-[11px] font-medium transition-all" style={calType === 'lunar' ? { background: 'var(--zm-sep)', color: 'var(--zm-t1)' } : { color: 'var(--zm-t3)' }}>{t('calendarLunar', lang)}</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {([
                            { val: birthYear, set: setBirthYear, items: YEARS, suffix: '' },
                            { val: birthMonth, set: setBirthMonth, items: MONTHS, suffix: lang === 'zh' ? '月' : '' },
                            { val: birthDay, set: setBirthDay, items: Array.from({ length: maxDay }, (_, i) => i + 1), suffix: lang === 'zh' ? '日' : '' },
                          ] as const).map((col, i) => (
                            <Select key={i} value={String(col.val)} onValueChange={v => col.set(Number(v) as never)}>
                              <SelectTrigger className="h-12 rounded-2xl text-[15px] border-0" style={inputStyle}><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-2xl max-h-48 bg-zm-elevated border-0 zm-card-shadow-lg">
                                {col.items.map(v => <SelectItem key={v} value={String(v)} className="text-[14px] text-zm-t2">{v}{col.suffix}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-[12px] shrink-0 text-zm-t3">{t('birthTime', lang)}</Label>
                          <Input type="time" value={birthTime} onChange={e => setBirthTime(e.target.value)} className="h-9 rounded-xl text-[13px] flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0" style={inputStyle} />
                        </div>
                      </div>

                      {/* Bazi Display */}
                      {baziData && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                          <div className="rounded-[20px] p-5" style={{ background: `linear-gradient(135deg, var(--zm-accent-glow), transparent)`, boxShadow: 'inset 0 0 0 0.5px rgba(212,169,106,0.08)' }}>
                            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-4 text-zm-accent">{t('autoBazi', lang)}</div>
                            <div className="grid grid-cols-4 gap-2.5 text-center">
                              {[t('year', lang), t('month', lang), t('day', lang), t('hour', lang)].map((label, i) => (
                                <div key={label} className="rounded-[14px] py-2.5 bg-[var(--zm-bazi-bg)]">
                                  <div className="font-bold text-[16px] text-zm-t1">{[baziData.yearPillar, baziData.monthPillar, baziData.dayPillar, baziData.hourPillar][i]}</div>
                                  <div className="text-[10px] mt-1 font-medium text-zm-t3">{label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[11px] text-zm-t3">
                              <span>{baziData.shengxiao} · {baziData.xingzuo}</span>
                              {baziData.missingElements.length > 0 && <span style={{ color: 'color-mix(in srgb, var(--zm-accent) 56%, transparent)' }}>{t('missing', lang)}{baziData.missingElements.join(', ')}</span>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {baziLoading && <div className="flex items-center gap-2.5 text-[12px] text-zm-t3"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('calculatingBazi', lang)}</div>}

                      {/* Birth Place */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium text-zm-t1">{t('birthPlace', lang)} <span className="text-zm-t3">({t('optional', lang)})</span></Label>
                        <Input value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder={t('birthPlacePlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-zm-t3 focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={inputStyle} />
                      </div>

                      {/* Platform */}
                      <div className="space-y-2">
                        <Label className="text-[13px] font-medium text-zm-t1">{t('mainPlatform', lang)} <span className="text-zm-t3">({t('optional', lang)})</span></Label>
                        <Select value={platform} onValueChange={setPlatform}>
                          <SelectTrigger className="h-12 rounded-2xl text-[15px] border-0" style={inputStyle}><SelectValue placeholder={t('selectPlatform', lang)} /></SelectTrigger>
                          <SelectContent className="rounded-2xl max-h-56 bg-zm-elevated border-0 zm-card-shadow-lg">
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zm-t3">{t('regionChina', lang)}</div>
                            {PLATFORMS.filter(p => p.r === 'cn').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px] text-zm-t2">{platformLabel(p, lang)}</SelectItem>)}
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] mt-1 text-zm-t3">{t('regionGlobal', lang)}</div>
                            {PLATFORMS.filter(p => p.r === 'global').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px] text-zm-t2">{platformLabel(p, lang)}</SelectItem>)}
                            {PLATFORMS.filter(p => p.r === 'other').map(p => <SelectItem key={p.v} value={p.v} className="text-[14px] text-zm-t2">{platformLabel(p, lang)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate-only: Vibe + Lock Words */}
                      {mode === 'generate' && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-zm-t1">{t('specialRequirements', lang)} <span className="text-zm-accent">*</span></Label>
                            <Textarea value={vibeInput} onChange={e => { setVibeInput(e.target.value); if (vibeErr) setVibeErr('') }} placeholder={t('specialRequirementsPlaceholder', lang)} className="min-h-[80px] rounded-2xl text-[15px] placeholder:text-zm-t3 focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={inputStyle} />
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(lang === 'zh' ? STYLE_TAGS.zh : STYLE_TAGS.en).map((label, i) => (
                                <button key={label} onClick={() => { const cur = vibeInput.trim(); setVibeInput(cur ? `${cur} ${label}` : label); if (vibeErr) setVibeErr('') }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium active:scale-[0.92] transition-all"
                                  style={{ background: vibeInput.includes(label) ? 'rgba(var(--zm-accent-rgb),0.09)' : 'var(--zm-elevated)', color: vibeInput.includes(label) ? 'var(--zm-accent)' : 'var(--zm-t3)', boxShadow: 'var(--zm-inset)' }}>
                                  <span className="text-[10px]">{STYLE_EMOJIS[i]}</span> {label}
                                </button>
                              ))}
                            </div>
                            {vibeErr && <p className="text-[12px] text-zm-accent">{vibeErr}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-zm-t1">{t('nameLength', lang)} <span className="text-zm-t3">({t('optional', lang)})</span></Label>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold shrink-0 text-zm-t3 w-[20px]">中</span>
                                <Select value={nameLength.startsWith('zh-') ? nameLength : 'any'} onValueChange={v => setNameLength(v)}>
                                  <SelectTrigger className="h-10 rounded-xl text-[13px] border-0 flex-1" style={inputStyle}><SelectValue placeholder={t('nameLengthAny', lang)} /></SelectTrigger>
                                  <SelectContent className="rounded-xl max-h-56 bg-zm-elevated border-0 zm-card-shadow-lg">
                                    <SelectItem value="any" className="text-[13px] text-zm-t2">{t('nameLengthAny', lang)}</SelectItem>
                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                      <SelectItem key={`zh-${n}`} value={`zh-${n}`} className="text-[13px] text-zm-t2">{t('nameLengthChars', lang, { n })}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold shrink-0 text-zm-t3 w-[20px]">EN</span>
                                <Select value={nameLength.startsWith('en-') ? nameLength : 'any'} onValueChange={v => setNameLength(v)}>
                                  <SelectTrigger className="h-10 rounded-xl text-[13px] border-0 flex-1" style={inputStyle}><SelectValue placeholder={t('nameLengthAny', lang)} /></SelectTrigger>
                                  <SelectContent className="rounded-xl max-h-56 bg-zm-elevated border-0 zm-card-shadow-lg">
                                    <SelectItem value="any" className="text-[13px] text-zm-t2">{t('nameLengthAny', lang)}</SelectItem>
                                    {[4, 6, 8, 10, 12, 14, 16].map(n => (
                                      <SelectItem key={`en-${n}`} value={`en-${n}`} className="text-[13px] text-zm-t2">{t('nameLengthLetters', lang, { n })}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] font-medium text-zm-t1">{t('lockWords', lang)} <span className="text-zm-t3">({t('optional', lang)})</span></Label>
                            <Input value={lockedWords} onChange={e => setLockedWords(e.target.value)} placeholder={t('lockWordsPlaceholder', lang)} className="h-12 rounded-2xl text-[15px] placeholder:text-zm-t3 focus-visible:ring-0 focus-visible:ring-offset-0 border-0" style={inputStyle} />
                          </div>
                        </>
                      )}

                      {/* Submit */}
                      <button onClick={mode === 'evaluate' ? handleEvaluate : handleGenerate} className="w-full h-[52px] text-[16px] font-semibold rounded-[14px] active:scale-[0.97] transition-all border-0" style={btnPrimary}>
                        {mode === 'evaluate'
                          ? <span className="flex items-center justify-center gap-2.5"><Star className="w-[17px] h-[17px]" />{t('analyzeVibe', lang)}</span>
                          : <span className="flex items-center justify-center gap-2.5"><Zap className="w-[17px] h-[17px]" />{t('generateNames', lang)}</span>}
                      </button>

                      {/* Usage */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-center gap-4 text-[12px] text-zm-t3">
                          <span>{t('rating', lang)}: {usage.evalCount}/{usage.evalLimit}</span>
                          <span className="text-zm-sep">·</span>
                          <span>{t('generation', lang)}: {usage.genCount}/{usage.genLimit}</span>
                        </div>
                        <div className="text-center text-[11px] text-zm-t3">{t('dailyReset', lang)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {/* ═══ LOADING ═══ */}
            {(view === 'evaluating' || view === 'generating') && (
              <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--zm-accent)', animation: 'spin 1s linear infinite' }} />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent" style={{ borderBottomColor: 'var(--zm-accent)', opacity: 0.4, animation: 'spin 1.5s linear infinite reverse' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {view === 'evaluating' ? <Star className="w-7 h-7 text-zm-accent" /> : <Zap className="w-7 h-7 text-zm-accent" />}
                  </div>
                </div>
                <p className="text-[17px] font-semibold text-zm-t1">{view === 'evaluating' ? t('analyzingVibes', lang) : t('generatingNamesLoading', lang)}</p>
                <p className="text-[13px] mt-2 text-zm-t2">{view === 'evaluating' ? t('analyzingSub', lang) : t('generatingSub', lang)}</p>
              </motion.div>
            )}

            {/* ═══ EVAL RESULT (unified) ═══ */}
            {view === 'eval-result' && evalResult && (
              <ResultView result={evalResult} lang={lang} onBack={goBack} onShare={handleShare} />
            )}

            {/* ═══ GENERATE RESULT ═══ */}
            {view === 'gen-result' && genResult && (
              <motion.div key="gen-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={goBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium text-zm-accent active:scale-95 transition-all"><ArrowLeft className="w-4 h-4" />{t('back', lang)}</button>
                <SectionCard title={t('yiXueAnalysis', lang)}><MarkdownContent content={genResult.yiXueAnalysis || ''} /></SectionCard>
                <div className="mt-3"><SectionCard title={t('suggestedIndustries', lang)}><div className="text-[14px] text-zm-t2">{genResult.suggestedIndustries}</div></SectionCard></div>
                <div className="mt-4 space-y-2.5">
                  <div className="text-[13px] font-semibold mb-3 text-zm-t1">{t('top5Picks', lang)}</div>
                  {genResult.names?.map((n, i) => (
                    <motion.div key={n.name || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }}>
                      <button onClick={() => handleNameSelect(n.name)} className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-all bg-zm-elevated zm-inset">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[16px] font-semibold text-zm-t1">{n.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(var(--zm-accent-rgb),0.08)', color: 'var(--zm-accent)' }}>{n.style}</span>
                            <span className="text-[14px] font-bold text-zm-accent">{n.score}{t('score', lang)}</span>
                          </div>
                        </div>
                        <div className="text-[13px] text-zm-t2">{n.reason}</div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══ GEN → EVAL RESULT (unified) ═══ */}
            {view === 'gen-eval-result' && (
              <motion.div key="gen-eval-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={goBack} className="flex items-center gap-2 mb-6 text-[14px] font-medium text-zm-accent active:scale-95 transition-all"><ArrowLeft className="w-4 h-4" />{t('back', lang)}</button>
                {loading ? (
                  <div className="flex flex-col items-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-zm-accent" />
                    <p className="text-[15px] text-zm-t2">{t('evaluatingSelected', lang)}</p>
                    <p className="text-[13px] mt-1 text-zm-t3">{selectedName && `"${selectedName}"`}</p>
                  </div>
                ) : evalResult ? (
                  <ResultView result={evalResult} selectedName={selectedName} lang={lang} onBack={goBack} onShare={handleShare} />
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="mt-auto bg-zm-bg">
        <div className="max-w-[480px] mx-auto px-6 py-5 flex flex-col items-center gap-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <Image src="/logo-v8.png" alt="" width={10} height={10} className="rounded-[3px] opacity-25" />
            <span className="text-[11px] font-light text-zm-t3">{t('entertainmentOnly', lang)}</span>
          </div>
          <p className="text-[10px] font-light" style={{ color: 'color-mix(in srgb, var(--zm-t3) 40%, transparent)' }}>{t('aiPowered', lang)}</p>
        </div>
      </footer>

      {/* ═══ Paywall Dialog ═══ */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-[340px] rounded-3xl border-0 bg-zm-card">
          <DialogHeader>
            <DialogTitle className="text-center text-[18px] text-zm-t1">{t('noMoreFree', lang)}</DialogTitle>
            <DialogDescription className="text-center text-[14px] text-zm-t2">{t('shareToUnlock', lang)}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-4 py-4">
            <div className="text-center"><div className="text-[24px] font-bold text-zm-accent">{usage.evalCount}/{usage.evalLimit}</div><div className="text-[12px] text-zm-t3">{t('ratings', lang)}</div></div>
            <div className="text-center"><div className="text-[24px] font-bold text-zm-accent">{usage.genCount}/{usage.genLimit}</div><div className="text-[12px] text-zm-t3">{t('generations', lang)}</div></div>
          </div>
          <DialogFooter className="flex-col gap-2">
            <button onClick={() => { handleShare(); setShowPaywall(false) }} className="w-full h-[48px] rounded-[14px] text-[15px] font-semibold active:scale-[0.97] transition-all" style={btnPrimary}><Share2 className="w-4 h-4 inline mr-2" />{t('shareButton', lang)}</button>
            <button onClick={() => setShowPaywall(false)} className="w-full h-[40px] rounded-xl text-[14px] transition-all text-zm-t3">{t('gotIt', lang)}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Manual Dialog ═══ */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-[380px] max-h-[80vh] overflow-y-auto rounded-3xl border-0 bg-zm-card">
          <DialogHeader><DialogTitle className="text-[18px] text-zm-t1">{t('manualTitle', lang)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {[
              t('manualAboutTitle', lang), t('manualRateTitle', lang), t('manualGenTitle', lang),
              t('manualBaziTitle', lang), t('manualScoreTitle', lang), t('manualUsageTitle', lang),
            ].map((title, i) => (
              <div key={i}>
                <div className="text-[14px] font-semibold mb-1 text-zm-t1">{title}</div>
                <div className="text-[13px] leading-relaxed text-zm-t2">
                  <MarkdownContent content={[t('manualAboutContent', lang), t('manualRateContent', lang), t('manualGenContent', lang), t('manualBaziContent', lang), t('manualScoreContent', lang), t('manualUsageContent', lang)][i]} />
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
