import { Timestamp } from "firebase/firestore"
import { useEffect, useMemo, useState } from "react"

import { subscribeToXpTransactionsSince } from "@/features/gamification/services/xp-repository"
import type { XpTransaction } from "@/features/gamification/types/gamification"

export function useXpEarnedSince(uid: string | undefined, sinceMillis: number) {
  const [state, setState] = useState<{
    uid: string
    transactions: XpTransaction[]
    error: string | null
  } | null>(null)

  useEffect(() => {
    if (!uid) return
    return subscribeToXpTransactionsSince(
      uid,
      Timestamp.fromMillis(sinceMillis),
      (transactions) => setState({ uid, transactions, error: null }),
      (error) => setState({ uid, transactions: [], error: error.message }),
    )
  }, [sinceMillis, uid])

  const current = state?.uid === uid ? state : null
  const amount = useMemo(
    () =>
      current?.transactions.reduce((total, item) => total + item.amount, 0) ??
      0,
    [current?.transactions],
  )
  return {
    amount,
    isLoading: Boolean(uid) && !current,
    error: current?.error ?? null,
  }
}
