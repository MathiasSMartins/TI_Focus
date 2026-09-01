import { afterEach, describe, expect, it, vi } from "vitest"

import { createReconciliationRunner } from "@/utils/reconciliation-runner"

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

describe("createReconciliationRunner", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("reutiliza o sucesso dentro do TTL e permite reconciliação forçada", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"))
    const run = createReconciliationRunner(30_000)
    const operation = vi.fn(async () => undefined)

    await run("alice", operation)
    await run("alice", operation)
    expect(operation).toHaveBeenCalledTimes(1)

    await run("alice", operation, true)
    expect(operation).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(30_000)
    await run("alice", operation)
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it("invalida o TTL quando o relógio retrocede", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"))
    const run = createReconciliationRunner(30_000)
    const operation = vi.fn(async () => undefined)

    await run("alice", operation)
    vi.setSystemTime(new Date("2026-08-27T11:00:00.000Z"))
    await run("alice", operation)

    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("mantém chamadas comuns no passe atual e coalesce forças em um passe posterior", async () => {
    const run = createReconciliationRunner(30_000)
    const firstPass = deferred()
    const secondPass = deferred()
    const operation = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(firstPass.promise)
      .mockReturnValueOnce(secondPass.promise)

    const current = run("alice", operation)
    expect(run("alice", operation)).toBe(current)
    const forced = run("alice", operation, true)
    expect(run("alice", operation, true)).toBe(forced)
    expect(forced).not.toBe(current)
    expect(operation).toHaveBeenCalledTimes(1)

    firstPass.resolve()
    await current
    await vi.waitFor(() => expect(operation).toHaveBeenCalledTimes(2))
    secondPass.resolve()
    await forced
  })

  it("executa o passe forçado posterior mesmo quando o atual falha", async () => {
    const run = createReconciliationRunner(30_000)
    const firstPass = deferred()
    const operation = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(firstPass.promise)
      .mockResolvedValueOnce(undefined)

    const current = run("alice", operation)
    const forced = run("alice", operation, true)
    firstPass.reject(new Error("falha transitória"))

    await expect(current).rejects.toThrow("falha transitória")
    await expect(forced).resolves.toBeUndefined()
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("não armazena falhas e permite retry imediato", async () => {
    const run = createReconciliationRunner(30_000)
    const operation = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("falha transitória"))
      .mockResolvedValueOnce(undefined)

    await expect(run("alice", operation)).rejects.toThrow("falha transitória")
    await expect(run("alice", operation)).resolves.toBeUndefined()
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("mantém chaves de timezone independentes", async () => {
    const run = createReconciliationRunner(30_000)
    const operation = vi.fn(async () => undefined)

    await run("alice:UTC", operation)
    await run("alice:UTC", operation)
    await run("alice:America/Sao_Paulo", operation)

    expect(operation).toHaveBeenCalledTimes(2)
  })
})
