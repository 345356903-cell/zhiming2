'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Star, Shield, Eye, TrendingUp, Users, Heart, Flame, Pen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'

interface NameEvaluationResult {
  nameInterpretation: string
  ambiguityCheck: string
  yiXueScore: number
  onlineUsageAnalysis: string
  influencerLevel: number
  acceptanceLevel: number
  viralPotential: string
  renameSuggestions: string
  overallScore: number
  summary: string
}

interface EvaluationResultsProps {
  result: NameEvaluationResult
  onBack: () => void
}

function getScoreColor(score: number): string {
  if (score < 40) return 'text-red-400'
  if (score <= 70) return 'text-amber-400'
  return 'text-amber-300'
}

function getScoreGradient(score: number): string {
  if (score < 40) return 'from-red-600 to-red-400'
  if (score <= 70) return 'from-amber-600 to-amber-400'
  return 'from-amber-500 to-yellow-400'
}

function getProgressGradient(score: number): string {
  if (score < 40) return 'from-red-600 to-red-400'
  if (score <= 70) return 'from-amber-600 to-amber-400'
  return 'from-amber-500 to-yellow-300'
}

// Circular Score Gauge Component
function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 58
  const offset = circumference - (score / 100) * circumference
  const color = score < 40 ? '#ef4444' : score <= 70 ? '#f59e0b' : '#d4a853'
  const glowColor = score < 40 ? 'rgba(239,68,68,0.3)' : score <= 70 ? 'rgba(245,158,11,0.3)' : 'rgba(212,168,83,0.4)'

  return (
    <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto">
      {/* Background glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: glowColor }}
      />

      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        {/* Background circle */}
        <circle
          cx="64"
          cy="64"
          r="58"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <motion.circle
          cx="64"
          cy="64"
          r="58"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        {/* Decorative inner ring */}
        <circle
          cx="64"
          cy="64"
          r="48"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
        />
      </svg>

      {/* Center score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-4xl md:text-5xl font-bold ${getScoreColor(score)}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: 'spring' }}
        >
          {score}
        </motion.span>
        <span className="text-amber-200/40 text-xs tracking-wider mt-1">综合评分</span>
      </div>
    </div>
  )
}

// Progress Bar with golden gradient
function GoldenProgress({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-amber-200/70 text-sm">{label}</span>
        <span className={`text-sm font-semibold ${getScoreColor(value)}`}>{value}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${getProgressGradient(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          style={{
            boxShadow: `0 0 10px ${value < 40 ? 'rgba(239,68,68,0.3)' : value <= 70 ? 'rgba(245,158,11,0.3)' : 'rgba(212,168,83,0.4)'}`,
          }}
        />
      </div>
    </div>
  )
}

// Section card wrapper with animation
function SectionCard({
  children,
  delay = 0,
  className = '',
  glowing = false,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  glowing?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <Card
        className={`relative overflow-hidden bg-black/30 backdrop-blur-sm border-amber-900/20 ${
          glowing
            ? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
            : ''
        } ${className}`}
      >
        {glowing && (
          <motion.div
            className="absolute inset-0 rounded-xl border border-amber-400/30"
            animate={{
              boxShadow: [
                '0 0 5px rgba(212,168,83,0.1)',
                '0 0 20px rgba(212,168,83,0.3)',
                '0 0 5px rgba(212,168,83,0.1)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {children}
      </Card>
    </motion.div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

export default function EvaluationResults({ result, onBack }: EvaluationResultsProps) {
  return (
    <motion.div
      className="space-y-6 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回重新测算
        </Button>
      </motion.div>

      {/* 1. 综合评分卡 - Overall Score */}
      <SectionCard delay={0.1}>
        <CardContent className="pt-6 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-300">综合评分</h3>
          </div>
          <ScoreGauge score={result.overallScore} />
          {result.summary && (
            <motion.p
              className="text-amber-200/60 mt-4 text-sm leading-relaxed max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {result.summary}
            </motion.p>
          )}
        </CardContent>
      </SectionCard>

      {/* 2. 名字释义 - Name Interpretation */}
      <SectionCard delay={0.25}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">名字释义</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
            <ReactMarkdown>{result.nameInterpretation}</ReactMarkdown>
          </div>
        </CardContent>
      </SectionCard>

      {/* 3. 歧义检查 - Ambiguity Check */}
      <SectionCard delay={0.4}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">歧义检查</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
            <ReactMarkdown>{result.ambiguityCheck}</ReactMarkdown>
          </div>
        </CardContent>
      </SectionCard>

      {/* 4. 易学评分 - Yi Xue Score */}
      <SectionCard delay={0.55}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">易学评分</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GoldenProgress value={result.yiXueScore} label="命理契合度" />
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={`${
                result.yiXueScore < 40
                  ? 'bg-red-900/40 text-red-300 border-red-500/30'
                  : result.yiXueScore <= 70
                  ? 'bg-amber-900/40 text-amber-300 border-amber-500/30'
                  : 'bg-amber-800/40 text-amber-200 border-amber-400/30'
              }`}
            >
              {result.yiXueScore < 40 ? '命理不合' : result.yiXueScore <= 70 ? '尚可' : '大吉'}
            </Badge>
          </div>
        </CardContent>
      </SectionCard>

      {/* 5. 网上使用情况 - Online Usage Analysis */}
      <SectionCard delay={0.7}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">网上使用情况</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
            <ReactMarkdown>{result.onlineUsageAnalysis}</ReactMarkdown>
          </div>
        </CardContent>
      </SectionCard>

      {/* 6. 网红程度 - Influencer Level */}
      <SectionCard delay={0.85}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">网红程度</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GoldenProgress value={result.influencerLevel} label="网红指数" />
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={`${
                result.influencerLevel < 40
                  ? 'bg-gray-800/40 text-gray-300 border-gray-500/30'
                  : result.influencerLevel <= 70
                  ? 'bg-amber-900/40 text-amber-300 border-amber-500/30'
                  : 'bg-amber-800/40 text-amber-200 border-amber-400/30'
              }`}
            >
              {result.influencerLevel < 40 ? '低调隐匿' : result.influencerLevel <= 70 ? '小有名气' : '天生网红'}
            </Badge>
          </div>
        </CardContent>
      </SectionCard>

      {/* 7. 接受程度 - Acceptance Level */}
      <SectionCard delay={1.0}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">接受程度</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <GoldenProgress value={result.acceptanceLevel} label="大众认可度" />
          <div className="mt-3 flex items-center gap-2">
            <Badge
              className={`${
                result.acceptanceLevel < 40
                  ? 'bg-red-900/40 text-red-300 border-red-500/30'
                  : result.acceptanceLevel <= 70
                  ? 'bg-amber-900/40 text-amber-300 border-amber-500/30'
                  : 'bg-amber-800/40 text-amber-200 border-amber-400/30'
              }`}
            >
              {result.acceptanceLevel < 40 ? '争议较大' : result.acceptanceLevel <= 70 ? '中规中矩' : '广受好评'}
            </Badge>
          </div>
        </CardContent>
      </SectionCard>

      {/* 8. 爆火潜力 - Viral Potential (special glowing card) */}
      <SectionCard delay={1.15} glowing>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <CardTitle className="text-base bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">
              爆火潜力
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
            <ReactMarkdown>{result.viralPotential}</ReactMarkdown>
          </div>
        </CardContent>
      </SectionCard>

      {/* 9. 改名建议 - Rename Suggestions */}
      <SectionCard delay={1.3}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Pen className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base text-amber-300">改名建议</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
            <ReactMarkdown>{result.renameSuggestions}</ReactMarkdown>
          </div>
        </CardContent>
      </SectionCard>

      {/* Bottom back button */}
      <motion.div
        className="flex justify-center pt-4 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="border-amber-900/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          重新测算
        </Button>
      </motion.div>
    </motion.div>
  )
}
