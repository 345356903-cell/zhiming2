
---
Task ID: 1
Agent: main
Task: Improve usage model and add language toggle for v1.0.2

Work Log:
- Updated Prisma schema: added `streak` and `lastVisitDate` fields to UsageLimit
- Pushed schema changes to database
- Updated usage API: increased free limit from 3→5/day, added streak bonus (1/day, max +5), increased share bonus cap from 4→10, added secondsUntilReset countdown
- Updated evaluate API: added streak bonus calculation, increased limits
- Updated generate API: added streak bonus calculation, increased limits
- Updated i18n translations: added streak/bonus/countdown translations, improved coverage
- Updated page.tsx: added streak display in usage indicator, improved paywall with streak/share bonus cards, added CountdownTimer component with real-time countdown
- Removed unused imports (ChevronRight, Progress, createContext, useContext)
- Cleaned up lint errors

Stage Summary:
- Free limit increased: 3→5 per day
- Streak bonus: consecutive daily visits give +1 per day (max +5)
- Share bonus: each share gives +2 (max total +10, up from +4)
- Maximum possible daily limit: 5 base + 5 streak + 10 share = 20 attempts/day
- Language toggle already existed in header (中/EN button)
- LLM APIs already support lang parameter for Chinese/English output
- Paywall now shows streak info, share bonus info, and countdown timer to reset
