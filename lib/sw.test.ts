import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

/**
 * public/sw.js is a real Service Worker script — it references the SW
 * global `self` (not `window`/`globalThis`) and isn't a module (no
 * import/export), so it can't be imported directly even under vitest's
 * node environment. This loads its source text into a vm sandbox with a
 * minimal mock `self`/`caches`, capturing the listeners it registers via
 * `self.addEventListener` so they can be invoked directly and asserted on.
 * The real browser Cache/SW machinery is not exercised — only the
 * skipWaiting-gating logic this PR touches.
 */
function loadServiceWorker() {
  const swPath = fileURLToPath(new URL('../public/sw.js', import.meta.url))
  const src = readFileSync(swPath, 'utf-8')

  const listeners: Record<string, Array<(event: unknown) => void>> = {}
  const skipWaiting = vi.fn()
  const claim = vi.fn()
  const cacheStub = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(undefined),
  }

  const sandbox = {
    self: {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        ;(listeners[type] ??= []).push(handler)
      },
      skipWaiting,
      clients: { claim },
    },
    caches: {
      open: vi.fn().mockResolvedValue(cacheStub),
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox)

  return { listeners, skipWaiting }
}

/** Fire all handlers registered for `type`, defaulting to a no-op event stub. */
function fire(
  listeners: Record<string, Array<(event: unknown) => void>>,
  type: string,
  event: unknown = { waitUntil: vi.fn() }
) {
  for (const handler of listeners[type] ?? []) handler(event)
}

describe('sw.js', () => {
  it('does not call self.skipWaiting() during the install event (regression: was unconditional)', () => {
    const { listeners, skipWaiting } = loadServiceWorker()
    expect(listeners.install?.length).toBeGreaterThan(0)

    fire(listeners, 'install')

    expect(skipWaiting).not.toHaveBeenCalled()
  })

  it('calls self.skipWaiting() when it receives a message with type SKIP_WAITING', () => {
    const { listeners, skipWaiting } = loadServiceWorker()
    expect(listeners.message?.length).toBeGreaterThan(0)

    fire(listeners, 'message', { data: { type: 'SKIP_WAITING' } })

    expect(skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('does not call self.skipWaiting() for a message with a different type', () => {
    const { listeners, skipWaiting } = loadServiceWorker()

    fire(listeners, 'message', { data: { type: 'SOME_OTHER_MESSAGE' } })

    expect(skipWaiting).not.toHaveBeenCalled()
  })

  it('does not throw when a message event has no data property', () => {
    const { listeners } = loadServiceWorker()

    expect(() => fire(listeners, 'message', {})).not.toThrow()
  })
})
