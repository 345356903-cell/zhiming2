'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NameEvaluationFormProps {
  onResult: (result: any) => void
  onLoading: (loading: boolean) => void
  disabled?: boolean
  usageExhausted?: boolean
  fingerprint?: string
}

const PLATFORMS = ['微信', '抖音', '小红书', '微博', 'B站', 'QQ', '其他']

export default function NameEvaluationForm({
  onResult,
  onLoading,
  disabled = false,
  usageExhausted = false,
  fingerprint = '',
}: NameEvaluationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    bazi: '',
    birthPlace: '',
    platform: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = '请输入网名'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (disabled || usageExhausted || isLoading) return

    setIsLoading(true)
    onLoading(true)

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, fingerprint }),
      })

      if (response.status === 429) {
        onResult({ error: '免费评测次数已用完', used: true })
        return
      }

      if (!response.ok) {
        throw new Error('评测请求失败')
      }

      const result = await response.json()
      onResult(result)
    } catch (error) {
      console.error('Evaluation error:', error)
      onResult({
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
      onLoading(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-amber-900/30 shadow-2xl">
        {/* Decorative corner ornaments */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-500/40 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/40 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-amber-500/40 rounded-br-xl" />

        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

        <CardHeader className="relative z-10 text-center pb-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-amber-500/60 text-xs tracking-[0.3em] uppercase">
                Name Evaluation
              </span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 bg-clip-text text-transparent">
              名鉴 · 网名评测
            </CardTitle>
            <CardDescription className="text-amber-200/50 mt-2 text-base">
              探寻网名背后的玄机与命理
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 网名 - Required */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-amber-500/80">◆</span>
                网名
                <span className="text-red-400 text-xs">*必填</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="请输入您的网名"
                className="bg-black/30 border-amber-900/40 text-amber-50 placeholder:text-amber-200/30 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                disabled={isLoading || disabled}
              />
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs"
                >
                  {errors.name}
                </motion.p>
              )}
            </motion.div>

            {/* 出生日期 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-amber-500/80">◆</span>
                出生日期
              </Label>
              <Input
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)}
                className="bg-black/30 border-amber-900/40 text-amber-50 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20 [color-scheme:dark]"
                disabled={isLoading || disabled}
              />
            </motion.div>

            {/* 八字 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-amber-500/80">◆</span>
                八字
              </Label>
              <Input
                value={formData.bazi}
                onChange={(e) => updateField('bazi', e.target.value)}
                placeholder="如：甲子年丙寅月戊辰日己巳时"
                className="bg-black/30 border-amber-900/40 text-amber-50 placeholder:text-amber-200/30 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                disabled={isLoading || disabled}
              />
            </motion.div>

            {/* 出生地 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-amber-500/80">◆</span>
                出生地
              </Label>
              <Input
                value={formData.birthPlace}
                onChange={(e) => updateField('birthPlace', e.target.value)}
                placeholder="如：北京"
                className="bg-black/30 border-amber-900/40 text-amber-50 placeholder:text-amber-200/30 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                disabled={isLoading || disabled}
              />
            </motion.div>

            {/* 主要活动平台 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-amber-500/80">◆</span>
                主要活动平台
              </Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => updateField('platform', value)}
                disabled={isLoading || disabled}
              >
                <SelectTrigger className="w-full bg-black/30 border-amber-900/40 text-amber-50 focus:ring-amber-500/20">
                  <SelectValue placeholder="请选择平台" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-amber-900/40 backdrop-blur-md">
                  {PLATFORMS.map((platform) => (
                    <SelectItem
                      key={platform}
                      value={platform}
                      className="text-amber-50 focus:bg-amber-900/40 focus:text-amber-50"
                    >
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 py-6"
                  >
                    {/* Animated fortune-telling spinner */}
                    <div className="relative w-16 h-16">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-1 rounded-full border-2 border-t-amber-400 border-r-transparent border-b-transparent border-l-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-3 rounded-full border-2 border-t-transparent border-r-amber-300 border-b-transparent border-l-transparent"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-amber-400" />
                      </div>
                    </div>
                    <p className="text-amber-300/80 text-lg animate-pulse tracking-widest">
                      天机运算中...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                      type="submit"
                      disabled={disabled || usageExhausted}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 rounded-lg relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        开始测算
                      </span>
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Button>
                    {usageExhausted && (
                      <p className="text-center text-red-400/80 text-sm mt-2">
                        今日免费次数已用尽
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
