import type { Timestamp } from "firebase/firestore"

export const XP_EVENT_TYPES = ["TASK_COMPLETED"] as const

export type XpEventType = (typeof XP_EVENT_TYPES)[number]

export interface XpTransactionDocument {
  userId: string
  amount: number
  reason: string
  eventType: XpEventType
  taskId: string
  taskTitle: string
  createdAt: Timestamp
  xpBefore: number
  xpAfter: number
  levelBefore: number
  levelAfter: number
}

export interface XpTransaction extends XpTransactionDocument {
  id: string
}

export interface XpAwardResult {
  transactionId: string
  amount: number
  xpBefore: number
  xpAfter: number
  levelBefore: number
  levelAfter: number
  dailyLimitReached: boolean
  alreadyProcessed: boolean
}
