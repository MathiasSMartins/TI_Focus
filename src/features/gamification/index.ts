export { XpProgress } from "@/features/gamification/components/xp-progress"
export { XpRewardFeedback } from "@/features/gamification/components/xp-reward-feedback"
export {
  XP_DAILY_LIMIT,
  XP_REWARD_BY_PRIORITY,
  getLevelForXp,
  getLevelProgress,
  getLevelTitle,
  getMinimumXpForLevel,
  getTaskXpReward,
} from "@/features/gamification/domain/xp-system"
export { useXpTransactions } from "@/features/gamification/hooks/use-xp-transactions"
export { useXpEarnedSince } from "@/features/gamification/hooks/use-xp-earned-since"
export { GamificationProvider } from "@/features/gamification/providers/gamification-provider"
export type {
  GoalXpTransactionDocument,
  XpAwardResult,
  XpEventType,
  XpTransaction,
  XpTransactionDocument,
} from "@/features/gamification/types/gamification"
