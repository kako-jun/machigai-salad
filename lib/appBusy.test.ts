import { describe, it, expect, vi } from 'vitest'

/**
 * appBusy holds module-singleton state (`busy` / `idleWaiters` — see its own
 * doc comment). To keep tests independent of execution order, each test
 * gets a fresh module instance via vi.resetModules() + a dynamic import
 * instead of relying on the previous test's leftover state.
 */
async function freshAppBusy() {
  vi.resetModules()
  return import('@/lib/appBusy')
}

describe('appBusy', () => {
  it('starts idle: isAppBusy() is false on a fresh module', async () => {
    const { isAppBusy } = await freshAppBusy()
    expect(isAppBusy()).toBe(false)
  })

  it('setAppBusy(true) makes isAppBusy() true', async () => {
    const { setAppBusy, isAppBusy } = await freshAppBusy()
    setAppBusy(true)
    expect(isAppBusy()).toBe(true)
  })

  it('waitUntilIdle() resolves immediately while idle', async () => {
    const { waitUntilIdle } = await freshAppBusy()
    await expect(waitUntilIdle()).resolves.toBeUndefined()
  })

  it('waitUntilIdle() stays pending while busy', async () => {
    const { setAppBusy, waitUntilIdle } = await freshAppBusy()
    setAppBusy(true)
    const result = await Promise.race([
      waitUntilIdle().then(() => 'resolved'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 20)),
    ])
    expect(result).toBe('timeout')
  })

  it('setAppBusy(false) resolves a waiter that was pending while busy', async () => {
    const { setAppBusy, waitUntilIdle } = await freshAppBusy()
    setAppBusy(true)
    const waiter = waitUntilIdle()
    setAppBusy(false)
    await expect(waiter).resolves.toBeUndefined()
  })

  it('setAppBusy(false) resolves every pending waiter, not just the first', async () => {
    const { setAppBusy, waitUntilIdle } = await freshAppBusy()
    setAppBusy(true)
    const waiters = [waitUntilIdle(), waitUntilIdle(), waitUntilIdle()]
    setAppBusy(false)
    await expect(Promise.all(waiters)).resolves.toEqual([undefined, undefined, undefined])
  })

  it('re-calling setAppBusy(true) while already busy does not resolve pending waiters', async () => {
    const { setAppBusy, waitUntilIdle } = await freshAppBusy()
    setAppBusy(true)
    const waiter = waitUntilIdle()
    setAppBusy(true) // still busy — must be a no-op with respect to waiters
    const result = await Promise.race([
      waiter.then(() => 'resolved'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 20)),
    ])
    expect(result).toBe('timeout')
  })

  it('setAppBusy(false) while already idle is a no-op (no throw, stays idle)', async () => {
    const { setAppBusy, isAppBusy } = await freshAppBusy()
    expect(() => setAppBusy(false)).not.toThrow()
    expect(isAppBusy()).toBe(false)
  })

  it('does not double-resolve a waiter across repeated setAppBusy(false) calls', async () => {
    const { setAppBusy, waitUntilIdle } = await freshAppBusy()
    setAppBusy(true)
    const waiter = waitUntilIdle()
    let resolveCount = 0
    waiter.then(() => resolveCount++)

    setAppBusy(false) // first idle transition — resolves the waiter once
    await waiter

    setAppBusy(false) // already idle — must not re-invoke the same waiter's resolve
    setAppBusy(false)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(resolveCount).toBe(1)
  })
})
