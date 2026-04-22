'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Star, Briefcase, Crown, Check, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'

interface NameGenerationResult {
  yiXueAnalysis: string
  suggestedIndustries: string
  names: Array<{
    name: string
    score: number
    reason: string
    style: string
  }>
}

interface GeneratedNamesProps {
  result: NameGenerationResult
  onNameSelect: (name: string) => void
  onBack: () => void
}

function getScoreBadgeColor(score: number): string {
  if (score < 40) return 'bg-red-900/50 text-red-300 border-red-500/30'
  if (score <= 70) return 'bg-amber-900/50 text-amber-300 border-amber-500/30'
  return 'bg-amber-800/50 text-amber-200 border-amber-400/30'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return '天选之名'
  if (score >= 80) return '上吉'
  if (score >= 70) return '中吉'
  if (score >= 60) return '小吉'
  if (score >= 40) return '尚可'
  return '不宜'
}

export default function GeneratedNamesPropsComponent({
  result,
  onNameSelect,
  onBack,
}: GeneratedNamesProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [confirmingName, setConfirmingName] = useState<string | null>(null)

  const handleSelect = (name: string) => {
    if (confirmingName === name) {
      // Confirmed selection
      setSelectedName(name)
      onNameSelect(name)
      setConfirmingName(null)
    } else {
      // First click - show confirmation
      setConfirmingName(name)
      // Reset after 3 seconds if not confirmed
      setTimeout(() => {
        setConfirmingName((prev) => (prev === name ? null : prev))
      }, 3000)
    }
  }

  return (
    <motion.div
      className="space-y-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
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
          返回重新求取
        </Button>
      </motion.div>

      {/* 易学测评 - Yi Xue Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-black/30 backdrop-blur-sm border-amber-900/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-amber-300">易学测评</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
              <ReactMarkdown>{result.yiXueAnalysis}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 推测建议行业 - Suggested Industries */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="bg-black/30 backdrop-blur-sm border-amber-900/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base text-amber-300">推测建议行业</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-amber-50/80 text-sm leading-relaxed prose prose-invert prose-amber max-w-none">
              <ReactMarkdown>{result.suggestedIndustries}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 五名推荐 - 5 Name Cards */}
      {result.names && result.names.length > 0 && (
        <div className="space-y-4">
          <motion.h3
            className="text-center text-amber-300/80 text-lg font-medium tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Crown className="w-5 h-5 inline-block mr-2 text-amber-400" />
            五名推荐
          </motion.h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.names.map((nameItem, index) => {
              const isSelected = selectedName === nameItem.name
              const isConfirming = confirmingName === nameItem.name

              return (
                <motion.div
                  key={nameItem.name}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.5 + index * 0.12,
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <Card
                    className={`relative overflow-hidden bg-black/30 backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-amber-400/70 shadow-lg shadow-amber-500/20'
                        : isConfirming
                        ? 'border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'border-amber-900/20 hover:border-amber-900/40 hover:shadow-md hover:shadow-amber-500/5'
                    }`}
                    onClick={() => handleSelect(nameItem.name)}
                  >
                    {/* Selected golden border glow */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-xl border-2 border-amber-400/50"
                        animate={{
                          boxShadow: [
                            '0 0 10px rgba(212,168,83,0.2)',
                            '0 0 25px rgba(212,168,83,0.4)',
                            '0 0 10px rgba(212,168,83,0.2)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}

                    {/* Hover glow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/3 transition-all duration-300 pointer-events-none" />

                    <CardContent className="pt-5 pb-5 relative z-10">
                      {/* Name & Score Row */}
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-2xl font-bold bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-clip-text text-transparent">
                          {nameItem.name}
                        </h4>
                        <Badge className={getScoreBadgeColor(nameItem.score)}>
                          {nameItem.score}分 · {getScoreLabel(nameItem.score)}
                        </Badge>
                      </div>

                      {/* Reason */}
                      <p className="text-amber-50/60 text-sm leading-relaxed mb-3">
                        {nameItem.reason}
                      </p>

                      {/* Style Tag */}
                      <div className="flex items-center gap-2 mb-4">
                        <Badge
                          variant="outline"
                          className="border-amber-700/40 text-amber-400/80 text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {nameItem.style}
                        </Badge>
                      </div>

                      {/* Select Button */}
                      <Button
                        className={`w-full text-sm transition-all duration-300 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 cursor-default'
                            : isConfirming
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black font-semibold hover:from-amber-500 hover:to-amber-400'
                            : 'bg-gradient-to-r from-amber-700/50 to-amber-600/50 text-amber-200 hover:from-amber-600/60 hover:to-amber-500/60'
                        }`}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelect(nameItem.name)
                        }}
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            已选定此名
                          </span>
                        ) : isConfirming ? (
                          <span className="flex items-center gap-1">
                            再次点击确认选择
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" />
                            选定此名
                          </span>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!result.names || result.names.length === 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <p className="text-amber-200/40 text-sm">暂无推荐名讳，请重新求取</p>
        </motion.div>
      )}

      {/* Bottom back button */}
      <motion.div
        className="flex justify-center pt-4 pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="border-amber-900/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          重新求取
        </Button>
      </motion.div>
    </motion.div>
  )
}
