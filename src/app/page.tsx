'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Flame, Scroll, Lock, Share2, Eye, Star } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import NameEvaluationForm from '@/components/name-evaluation-form'
import EvaluationResults from '@/components/evaluation-results'
import NameGenerationForm from '@/components/name-generation-form'
import GeneratedNames from '@/components/generated-names'

// Fingerprint generation using browser info
function generateFingerprint(): string {
  const nav = navigator
  const screen = window.screen
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 0,
  ].join('|')
  // Simple hash
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
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

type AppView = 'home' | 'evaluating' | 'eval-result' | 'generating' | 'gen-result' | 'gen-eval-result'

interface UsageState {
  evaluateUsed: boolean
  generateUsed: boolean
  evaluateCount: number
  generateCount: number
}

export default function Home() {
  const [view, setView] = useState<AppView>('home')
  const [activeTab, setActiveTab] = useState('evaluate')
  const [fingerprint, setFingerprint] = useState('')
  const [usage, setUsage] = useState<UsageState>({ evaluateUsed: false, generateUsed: false, evaluateCount: 0, generateCount: 0 })
  const [evalResult, setEvalResult] = useState<any>(null)
  const [genResult, setGenResult] = useState<any>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallType, setPaywallType] = useState<'evaluate' | 'generate'>('evaluate')
  const [scrolled, setScrolled] = useState(false)

  // Initialize fingerprint and fetch usage
  useEffect(() => {
    const fp = getOrCreateFingerprint()
    setFingerprint(fp)
  }, [])

  useEffect(() => {
    if (!fingerprint) return
    fetchUsage()
  }, [fingerprint])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/usage?fingerprint=${fingerprint}`)
      if (res.ok) {
        const data = await res.json()
        setUsage({
          evaluateUsed: data.evaluateUsed,
          generateUsed: data.generateUsed,
          evaluateCount: data.evaluateCount,
          generateCount: data.generateCount,
        })
      }
    } catch (e) {
      console.error('Failed to fetch usage:', e)
    }
  }

  // Evaluation handlers
  const handleEvalResult = useCallback((result: any) => {
    if (result.error || result.overallScore === 0) {
      if (result.used) {
        setPaywallType('evaluate')
        setShowPaywall(true)
      }
      return
    }
    setEvalResult(result.data || result)
    setView('eval-result')
    fetchUsage()
  }, [])

  const handleEvalLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    if (loading) setView('evaluating')
  }, [])

  // Generation handlers
  const handleGenResult = useCallback((result: any) => {
    if (result.error || (result.yiXueAnalysis === '测算失败，请稍后重试')) {
      if (result.used) {
        setPaywallType('generate')
        setShowPaywall(true)
      }
      return
    }
    setGenResult(result.data || result)
    setView('gen-result')
    fetchUsage()
  }, [])

  const handleGenLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    if (loading) setView('generating')
  }, [])

  // When user selects a name from generation results, re-evaluate it
  const handleNameSelect = useCallback(async (name: string) => {
    setSelectedName(name)
    setView('gen-eval-result')
    setIsLoading(true)

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, fingerprint }),
      })
      const data = await res.json()

      if (res.status === 429) {
        // Usage exhausted, still show what we can
        setEvalResult({
          overallScore: 0,
          summary: '天机不可泄露——您的免费测算次数已用尽，此名的深层命理暂不可知',
          nameInterpretation: `您选定了「${name}」作为网名。此名已被天书收录，但更深层的命理分析需要更高权限方可揭示。`,
          ambiguityCheck: '天机封印中，需解锁方可查看',
          yiXueScore: 0,
          onlineUsageAnalysis: '天机封印中，需解锁方可查看',
          influencerLevel: 0,
          acceptanceLevel: 0,
          viralPotential: '天机封印中，需解锁方可查看',
          renameSuggestions: '天机封印中，需解锁方可查看',
        })
      } else {
        setEvalResult(data.data || data)
      }
    } catch (e) {
      setEvalResult({
        overallScore: 0,
        summary: '测算失败，请稍后重试',
        nameInterpretation: '无法获取名字释义',
        ambiguityCheck: '无法进行歧义检查',
        yiXueScore: 0,
        onlineUsageAnalysis: '无法获取使用情况',
        influencerLevel: 0,
        acceptanceLevel: 0,
        viralPotential: '无法评估爆火潜力',
        renameSuggestions: '无法获取改名建议',
      })
    } finally {
      setIsLoading(false)
      fetchUsage()
    }
  }, [fingerprint])

  const handleBack = useCallback(() => {
    setView('home')
    setEvalResult(null)
    setGenResult(null)
    setSelectedName(null)
  }, [])

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: '名鉴 · 网名评测系统',
        text: `我刚用「名鉴」测了网名，综合评分${evalResult?.overallScore || '??'}分！快来测测你的网名吧！`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(
        `我刚用「名鉴」测了网名，综合评分${evalResult?.overallScore || '??'}分！快来测测你的网名吧！${window.location.href}`
      ).then(() => {
        alert('链接已复制到剪贴板！')
      }).catch(() => {})
    }
  }, [evalResult])

  // =================== RENDER ===================

  // Loading overlay for evaluating/generating
  const renderLoadingOverlay = () => (
    <AnimatePresence>
      {(view === 'evaluating' || view === 'generating') && isLoading && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-6">
            {/* Rotating trigram animation */}
            <div className="relative w-24 h-24">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-4 rounded-full border-2 border-t-transparent border-r-amber-300 border-b-transparent border-l-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-6 rounded-full border-2 border-t-transparent border-b-amber-500 border-r-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Scroll className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-amber-300 text-xl animate-pulse tracking-[0.2em]">
                {view === 'evaluating' ? '天机运算中' : '天书推演中'}
              </p>
              <p className="text-amber-200/40 text-sm mt-2">
                {view === 'evaluating' ? '正在解读名字背后的命理与玄机...' : '正在依据八字命理为您推演吉名...'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Paywall dialog
  const renderPaywall = () => (
    <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
      <DialogContent className="bg-gradient-to-b from-gray-950 to-black border-amber-800/30 text-amber-50 max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-amber-500/40"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-clip-text text-transparent">
            天机不可泄露
          </DialogTitle>
          <DialogDescription className="text-center text-amber-200/50 mt-2">
            您的免费测算次数已用尽
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <p className="text-amber-200/70 text-sm">
              每位有缘人仅可免费窥探一次天机，再次窥探需付出代价...
            </p>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center">
                <p className="text-amber-400 text-2xl font-bold">{usage.evaluateCount}</p>
                <p className="text-amber-200/40 text-xs">评测次数</p>
              </div>
              <div className="w-px h-8 bg-amber-800/30" />
              <div className="text-center">
                <p className="text-amber-400 text-2xl font-bold">{usage.generateCount}</p>
                <p className="text-amber-200/40 text-xs">起名次数</p>
              </div>
            </div>
          </div>
          <Card className="bg-amber-900/20 border-amber-800/30">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-amber-300 text-sm font-medium mb-2">分享解锁</p>
              <p className="text-amber-200/50 text-xs">
                将此系统分享给好友，即可获得额外一次免费测算机会
              </p>
              <Button
                onClick={handleShare}
                className="mt-3 bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400"
                size="sm"
              >
                <Share2 className="w-4 h-4 mr-1" />
                分享给好友
              </Button>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setShowPaywall(false)}
            className="text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10"
          >
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // Home view with tabs
  const renderHome = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        className="text-center space-y-4 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Main Logo & Title */}
        <div className="relative inline-block">
          {/* Decorative background glow */}
          <div className="absolute inset-0 blur-3xl bg-amber-500/10 rounded-full scale-150" />

          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Bagua-inspired decorative ring */}
            <div className="relative w-28 h-28 mx-auto mb-4">
              <motion.div
                className="absolute inset-0 rounded-full border border-amber-500/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-amber-500/40"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${deg}deg) translateY(-52px) translate(-50%, -50%)`,
                    }}
                  />
                ))}
              </motion.div>
              <motion.div
                className="absolute inset-3 rounded-full border border-amber-400/30"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-6 rounded-full border border-amber-300/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/mingjian-logo.png"
                  alt="名鉴Logo"
                  className="w-14 h-14 rounded-full object-cover border border-amber-500/30"
                />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
            名鉴
          </span>
        </motion.h1>

        <motion.p
          className="text-amber-200/50 text-lg md:text-xl tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          网名评测 · 命理起名 · 天机解读
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-6 text-xs text-amber-200/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <span className="flex items-center gap-1"><Star className="w-3 h-3" /> 易学测评</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> 歧义检查</span>
          <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> 爆火预测</span>
        </motion.div>

        {/* Usage badge */}
        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Badge variant="outline" className="border-amber-700/40 text-amber-400/70 text-xs">
            评测剩余 {Math.max(0, 1 - usage.evaluateCount)}/1
          </Badge>
          <Badge variant="outline" className="border-red-700/40 text-red-400/70 text-xs">
            起名剩余 {Math.max(0, 1 - usage.generateCount)}/1
          </Badge>
        </motion.div>
      </motion.div>

      {/* Tabs Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-amber-900/30 rounded-xl h-12 p-1">
            <TabsTrigger
              value="evaluate"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-700/60 data-[state=active]:to-amber-600/60 data-[state=active]:text-amber-100 text-amber-400/60 transition-all duration-300 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/10 text-sm font-medium"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              网名评测
            </TabsTrigger>
            <TabsTrigger
              value="generate"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-700/60 data-[state=active]:to-red-600/60 data-[state=active]:text-amber-100 text-amber-400/60 transition-all duration-300 data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/10 text-sm font-medium"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              天赐起名
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluate" className="mt-6">
            <NameEvaluationForm
              onResult={handleEvalResult}
              onLoading={handleEvalLoading}
              disabled={!fingerprint}
              usageExhausted={usage.evaluateUsed}
              fingerprint={fingerprint}
            />
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <NameGenerationForm
              onResult={handleGenResult}
              onLoading={handleGenLoading}
              disabled={!fingerprint}
              usageExhausted={usage.generateUsed}
              fingerprint={fingerprint}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )

  // Evaluation result view
  const renderEvalResult = () => (
    <div className="space-y-4">
      {evalResult && (
        <EvaluationResults
          result={evalResult}
          onBack={handleBack}
        />
      )}
      {/* Share button */}
      {evalResult && (
        <motion.div
          className="flex justify-center pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <Button
            onClick={handleShare}
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/20"
          >
            <Share2 className="w-4 h-4 mr-2" />
            分享我的评测结果
          </Button>
        </motion.div>
      )}
    </div>
  )

  // Generation result view
  const renderGenResult = () => (
    <div>
      {genResult && (
        <GeneratedNames
          result={genResult}
          onNameSelect={handleNameSelect}
          onBack={handleBack}
        />
      )}
    </div>
  )

  // Generated name re-evaluation view
  const renderGenEvalResult = () => (
    <div className="space-y-4">
      {selectedName && (
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-amber-200/50 text-sm">您选定的网名</p>
          <p className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent mt-1">
            {selectedName}
          </p>
        </motion.div>
      )}
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="relative w-16 h-16">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Scroll className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-amber-300/80 animate-pulse tracking-widest">正在评测选定网名...</p>
        </div>
      ) : (
        evalResult && (
          <EvaluationResults
            result={evalResult}
            onBack={handleBack}
          />
        )
      )}
      {evalResult && !isLoading && (
        <motion.div
          className="flex justify-center pb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <Button
            onClick={handleShare}
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-500/20"
          >
            <Share2 className="w-4 h-4 mr-2" />
            分享我的评测结果
          </Button>
        </motion.div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-black to-gray-950">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-800/2 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-amber-900/20' : 'bg-transparent'}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/mingjian-logo.png" alt="名鉴" className="w-7 h-7 rounded-full object-cover border border-amber-500/30" />
            <span className="text-amber-300 font-bold text-lg tracking-wider">名鉴</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-800/30 text-amber-500/70 text-xs">
              v1.0
            </Badge>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-12">
          <AnimatePresence mode="wait">
            {(view === 'home' || view === 'evaluating' || view === 'generating') && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderHome()}
              </motion.div>
            )}

            {view === 'eval-result' && (
              <motion.div
                key="eval-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {renderEvalResult()}
              </motion.div>
            )}

            {view === 'gen-result' && (
              <motion.div
                key="gen-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {renderGenResult()}
              </motion.div>
            )}

            {view === 'gen-eval-result' && (
              <motion.div
                key="gen-eval-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                {renderGenEvalResult()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-900/10 bg-black/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/mingjian-logo.png" alt="名鉴" className="w-4 h-4 rounded-full object-cover border border-amber-500/20" />
              <span className="text-amber-300/40 text-sm">名鉴 · 网名评测系统</span>
            </div>
            <div className="flex items-center gap-4 text-amber-200/20 text-xs">
              <span>仅供娱乐参考</span>
              <span>·</span>
              <span>命理分析基于AI生成</span>
              <span>·</span>
              <span>非科学依据</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      {renderLoadingOverlay()}
      {renderPaywall()}
    </div>
  )
}
