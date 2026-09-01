export function createReconciliationRunner(ttlMs: number) {
  const reconciliationByKey = new Map<string, Promise<void>>()
  const forcedAfterCurrentByKey = new Map<string, Promise<void>>()
  const reconciledAtByKey = new Map<string, number>()

  const startReconciliation = (key: string, operation: () => Promise<void>) => {
    reconciledAtByKey.delete(key)
    const reconciliation = operation()
      .then(() => {
        reconciledAtByKey.set(key, Date.now())
      })
      .finally(() => {
        if (reconciliationByKey.get(key) === reconciliation) {
          reconciliationByKey.delete(key)
        }
      })
    reconciliationByKey.set(key, reconciliation)
    return reconciliation
  }

  return function runReconciliation(
    key: string,
    operation: () => Promise<void>,
    force = false,
  ): Promise<void> {
    const current = reconciliationByKey.get(key)
    if (current) {
      if (!force) return current

      const queued = forcedAfterCurrentByKey.get(key)
      if (queued) return queued

      const forcedReconciliation = current
        .catch(() => undefined)
        .then(() => {
          if (forcedAfterCurrentByKey.get(key) === forcedReconciliation) {
            forcedAfterCurrentByKey.delete(key)
          }
          return startReconciliation(key, operation)
        })
        .finally(() => {
          if (forcedAfterCurrentByKey.get(key) === forcedReconciliation) {
            forcedAfterCurrentByKey.delete(key)
          }
        })
      forcedAfterCurrentByKey.set(key, forcedReconciliation)
      return forcedReconciliation
    }

    const reconciledAt = reconciledAtByKey.get(key)
    if (!force && reconciledAt !== undefined) {
      const elapsedMs = Date.now() - reconciledAt
      if (elapsedMs >= 0 && elapsedMs < ttlMs) return Promise.resolve()
      if (elapsedMs < 0) reconciledAtByKey.delete(key)
    }

    return startReconciliation(key, operation)
  }
}
