import { useEffect, useState } from "react"

import { subscribeToXpTransactions } from "@/features/gamification/services/xp-repository"
import type { XpTransaction } from "@/features/gamification/types/gamification"

interface XpTransactionState {
  uid: string
  transactions: XpTransaction[]
  error: string | null
}

export function useXpTransactions(uid: string | undefined, maximum = 20) {
  const [state, setState] = useState<XpTransactionState | null>(null)

  useEffect(() => {
    if (!uid) return
    let active = true

    const unsubscribe = subscribeToXpTransactions(
      uid,
      (transactions) => {
        if (active) setState({ uid, transactions, error: null })
      },
      (error) => {
        if (active) setState({ uid, transactions: [], error: error.message })
      },
      maximum,
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [maximum, uid])

  const current = state?.uid === uid ? state : null
  return {
    transactions: current?.transactions ?? [],
    isLoading: Boolean(uid) && current === null,
    error: current?.error ?? null,
  }
}
