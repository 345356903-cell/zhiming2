'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NameGenerationFormProps {
  onResult: (result: any) => void
  onLoading: (loading: boolean) => void
  disabled?: boolean
  usageExhausted?: boolean
  fingerprint?: string
}

const PLATFORMS = ['微信', '抖音', '小红书', '微博', 'B站', 'QQ', '其他']

export default function NameGenerationForm({
  onResult,
  onLoading,
  disabled = false,
  usageExhausted = false,
  fingerprint = '',
}: NameGenerationFormProps) {
  const [formData, setFormData] = useState({
    bazi: '',
    birthPlace: '',
    platform: '',
    specialRequirements: '',
    lockedWords: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.bazi.trim()) {
      newErrors.bazi = '请输入八字信息'
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bazi: formData.bazi,
          birthPlace: formData.birthPlace,
          platform: formData.platform,
          requirements: formData.specialRequirements,
          lockedWords: formData.lockedWords,
          fingerprint,
        }),
      })

      if (response.status === 429) {
        onResult({ error: '免费生成次数已用完', used: true })
        return
      }

      if (!response.ok) {
        throw new Error('起名请求失败')
      }

      const result = await response.json()
      onResult(result)
    } catch (error) {
      console.error('Generation error:', error)
      onResult({
        yiXueAnalysis: '测算失败，请稍后重试',
        suggestedIndustries: '无法推测建议行业',
        names: [],
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
      <Card className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-red-900/30 shadow-2xl">
        {/* Decorative corner ornaments - crimson accent */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-red-500/40 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-500/40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-500/40 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-red-500/40 rounded-br-xl" />

        {/* Subtle background glow - crimson */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-amber-500/3 to-red-500/5 pointer-events-none" />

        <CardHeader className="relative z-10 text-center pb-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-red-400" />
              <span className="text-red-400/60 text-xs tracking-[0.3em] uppercase">
                Name Generation
              </span>
              <Flame className="w-5 h-5 text-red-400" />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 via-amber-400 to-red-400 bg-clip-text text-transparent">
              天赐 · 起名系统
            </CardTitle>
            <CardDescription className="text-red-200/50 mt-2 text-base">
              依据命理为您量身定制网名
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 八字 - Required */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-red-400/80">◆</span>
                八字
                <span className="text-red-400 text-xs">*必填</span>
              </Label>
              <Input
                value={formData.bazi}
                onChange={(e) => updateField('bazi', e.target.value)}
                placeholder="如：甲子年丙寅月戊辰日己巳时"
                className="bg-black/30 border-red-900/40 text-amber-50 placeholder:text-red-200/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                disabled={isLoading || disabled}
              />
              {errors.bazi && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs"
                >
                  {errors.bazi}
                </motion.p>
              )}
            </motion.div>

            {/* 出生地 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-red-400/80">◆</span>
                出生地
              </Label>
              <Input
                value={formData.birthPlace}
                onChange={(e) => updateField('birthPlace', e.target.value)}
                placeholder="如：北京"
                className="bg-black/30 border-red-900/40 text-amber-50 placeholder:text-red-200/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                disabled={isLoading || disabled}
              />
            </motion.div>

            {/* 使用平台 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-red-400/80">◆</span>
                使用平台
              </Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => updateField('platform', value)}
                disabled={isLoading || disabled}
              >
                <SelectTrigger className="w-full bg-black/30 border-red-900/40 text-amber-50 focus:ring-red-500/20">
                  <SelectValue placeholder="请选择平台" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-red-900/40 backdrop-blur-md">
                  {PLATFORMS.map((platform) => (
                    <SelectItem
                      key={platform}
                      value={platform}
                      className="text-amber-50 focus:bg-red-900/40 focus:text-amber-50"
                    >
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* 特殊要求 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-red-400/80">◆</span>
                特殊要求
              </Label>
              <Textarea
                value={formData.specialRequirements}
                onChange={(e) => updateField('specialRequirements', e.target.value)}
                placeholder="如：希望带有古风韵味、字数限制等"
                className="bg-black/30 border-red-900/40 text-amber-50 placeholder:text-red-200/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20 min-h-20"
                disabled={isLoading || disabled}
              />
            </motion.div>

            {/* 字词锁定 */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Label className="text-amber-400 text-sm font-medium flex items-center gap-2">
                <span className="text-red-400/80">◆</span>
                字词锁定
              </Label>
              <Input
                value={formData.lockedWords}
                onChange={(e) => updateField('lockedWords', e.target.value)}
                placeholder="如：必须包含'月'字"
                className="bg-black/30 border-red-900/40 text-amber-50 placeholder:text-red-200/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
                disabled={isLoading || disabled}
              />
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
                    {/* Animated crimson spinner */}
                    <div className="relative w-16 h-16">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-red-500/30"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-1 rounded-full border-2 border-t-red-400 border-r-transparent border-b-transparent border-l-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute inset-3 rounded-full border-2 border-t-transparent border-r-amber-400 border-b-transparent border-l-transparent"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    <p className="text-red-300/80 text-lg animate-pulse tracking-widest">
                      天机运算中...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                      type="submit"
                      disabled={disabled || usageExhausted}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 rounded-lg relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Flame className="w-5 h-5" />
                        求取名讳
                      </span>
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
