import { describe, it, expect, vi } from 'vitest'
import {
  watchInstallingWorker,
  detectExistingUpdate,
  makeIdleGatedOnce,
} from '@/lib/swUpdateDetection'

/** Minimal ServiceWorker-shaped stub — captures the `statechange` handler so tests can fire it directly. */
function makeWorker(initialState: string) {
  const listeners: Array<() => void> = []
  const worker = {
    state: initialState,
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (type === 'statechange') listeners.push(handler)
    }),
    postMessage: vi.fn(),
  }
  return {
    worker,
    setState(state: string) {
      worker.state = state
    },
    fireStatechange() {
      for (const handler of listeners) handler()
    },
  }
}

describe('watchInstallingWorker', () => {
  it('calls onInstalled when the worker reaches installed and a controller already exists', () => {
    const { worker, setState, fireStatechange } = makeWorker('installing')
    const onInstalled = vi.fn()

    watchInstallingWorker(worker, () => true, onInstalled)
    setState('installed')
    fireStatechange()

    expect(onInstalled).toHaveBeenCalledTimes(1)
    expect(onInstalled).toHaveBeenCalledWith(worker)
  })

  it('does not call onInstalled while the worker is still installing (regression: #51 must 1)', () => {
    const { worker, fireStatechange } = makeWorker('installing')
    const onInstalled = vi.fn()

    watchInstallingWorker(worker, () => true, onInstalled)
    fireStatechange() // still 'installing' — no state change to 'installed' yet

    expect(onInstalled).not.toHaveBeenCalled()
  })

  it('does not call onInstalled when installed but there is no existing controller (first install, not an update)', () => {
    const { worker, setState, fireStatechange } = makeWorker('installing')
    const onInstalled = vi.fn()

    watchInstallingWorker(worker, () => false, onInstalled)
    setState('installed')
    fireStatechange()

    expect(onInstalled).not.toHaveBeenCalled()
  })

  it('re-fires onInstalled correctly if statechange fires multiple times, only counting the installed transition', () => {
    const { worker, setState, fireStatechange } = makeWorker('installing')
    const onInstalled = vi.fn()

    watchInstallingWorker(worker, () => true, onInstalled)
    fireStatechange() // still installing
    setState('installed')
    fireStatechange() // now installed
    fireStatechange() // installed again (e.g. duplicate event) — handler doesn't dedupe this itself

    expect(onInstalled).toHaveBeenCalledTimes(2)
  })
})

describe('detectExistingUpdate', () => {
  it('regression (#51 must 1): calls onInstalled immediately for a worker already in `waiting` at mount time', () => {
    const { worker } = makeWorker('installed')
    const onInstalled = vi.fn()

    detectExistingUpdate({ waiting: worker, installing: null }, () => true, onInstalled)

    expect(onInstalled).toHaveBeenCalledTimes(1)
    expect(onInstalled).toHaveBeenCalledWith(worker)
  })

  it('does not treat an already-waiting worker as an update when there is no existing controller (first install)', () => {
    const { worker } = makeWorker('installed')
    const onInstalled = vi.fn()

    detectExistingUpdate({ waiting: worker, installing: null }, () => false, onInstalled)

    expect(onInstalled).not.toHaveBeenCalled()
  })

  it('regression (#51 must 1): watches a worker already `installing` at mount time and detects it once installed', () => {
    const { worker, setState, fireStatechange } = makeWorker('installing')
    const onInstalled = vi.fn()

    detectExistingUpdate({ waiting: null, installing: worker }, () => true, onInstalled)
    expect(onInstalled).not.toHaveBeenCalled() // not installed yet — must watch, not fire immediately

    setState('installed')
    fireStatechange()

    expect(onInstalled).toHaveBeenCalledTimes(1)
    expect(onInstalled).toHaveBeenCalledWith(worker)
  })

  it('is a no-op when there is neither a waiting nor an installing worker', () => {
    const onInstalled = vi.fn()
    expect(() =>
      detectExistingUpdate({ waiting: null, installing: null }, () => true, onInstalled)
    ).not.toThrow()
    expect(onInstalled).not.toHaveBeenCalled()
  })
})

describe('makeIdleGatedOnce', () => {
  it('runs immediately when not busy', () => {
    const run = vi.fn()
    const attempt = makeIdleGatedOnce({
      isBusy: () => false,
      waitUntilIdle: () => Promise.resolve(),
      run,
    })

    attempt()

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('regression (#51 must 2): defers run() while busy and retries once idle, instead of forcing it through', async () => {
    let busy = true
    const run = vi.fn()
    let releaseIdle: () => void = () => {}
    const waitUntilIdle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseIdle = resolve
        })
    )
    const attempt = makeIdleGatedOnce({ isBusy: () => busy, waitUntilIdle, run })

    attempt()
    expect(run).not.toHaveBeenCalled()
    expect(waitUntilIdle).toHaveBeenCalledTimes(1)

    // User finishes their task — idle transition resolves the pending wait.
    busy = false
    releaseIdle()
    await Promise.resolve() // flush the .then(attempt) microtask

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries through multiple busy periods before finally running once truly idle', async () => {
    let busyCount = 2 // busy on the first two attempts, idle on the third
    const run = vi.fn()
    const releases: Array<() => void> = []
    const waitUntilIdle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releases.push(resolve)
        })
    )
    const attempt = makeIdleGatedOnce({
      isBusy: () => busyCount > 0,
      waitUntilIdle,
      run,
    })

    attempt()
    expect(waitUntilIdle).toHaveBeenCalledTimes(1)

    busyCount -= 1
    releases[0]()
    await Promise.resolve()
    expect(run).not.toHaveBeenCalled()
    expect(waitUntilIdle).toHaveBeenCalledTimes(2)

    busyCount -= 1
    releases[1]()
    await Promise.resolve()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('regression (#51 must 2): only runs once even if called multiple times (controllerchange + fallback timer racing)', () => {
    const run = vi.fn()
    const attempt = makeIdleGatedOnce({
      isBusy: () => false,
      waitUntilIdle: () => Promise.resolve(),
      run,
    })

    attempt() // e.g. controllerchange fires
    attempt() // e.g. fallback timer also fires

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not run again after a deferred idle-retry has already run once', async () => {
    let busy = true
    const run = vi.fn()
    let releaseIdle: () => void = () => {}
    const waitUntilIdle = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseIdle = resolve
        })
    )
    const attempt = makeIdleGatedOnce({ isBusy: () => busy, waitUntilIdle, run })

    attempt() // deferred (busy)
    attempt() // called again before idle (e.g. a second trigger) — must not stack another wait

    busy = false
    releaseIdle()
    await Promise.resolve()

    expect(run).toHaveBeenCalledTimes(1)
  })
})
