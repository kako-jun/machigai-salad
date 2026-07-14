import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/**
 * ServiceWorkerRegister.tsx is a 'use client' React component and can't be
 * rendered under vitest's node environment (vitest.config.ts is node-env,
 * *.test.ts only — no jsdom/RTL in this repo). So instead of exercising the
 * component, this parses its source with the TypeScript compiler API and
 * asserts the *shape* of the registration effect directly: a structural
 * regression guard for a bug found in independent review of #51.
 *
 * Regression: the SW-registration useEffect used to depend on `[t]`
 * (lib/i18n.tsx's translator, a useCallback keyed on `lang`). Because `t`'s
 * reference changes whenever `lang` changes — e.g. the client-side language
 * auto-detect effect flipping 'ja' -> 'en' shortly after mount on `/` (any
 * non-forcedLang route) — that dependency re-ran the whole effect. Its
 * cleanup only sets `cancelled = true`; it never removed the `updatefound`
 * listener it had attached to the registration. So a real update landing
 * later fired *two* listeners (one stale, one live) synchronously off the
 * same `statechange` event, and the module-level `applying` guard's
 * interaction with the stale listener's `cancelled` check meant the update
 * could be silently dropped — no error, no overlay, no reload. See
 * ServiceWorkerRegister.tsx's comment above the registration effect for the
 * full trace.
 *
 * The fix: the registration effect must run exactly once (`[]`), and the
 * current translation is read through a ref (`tRef.current`) instead of a
 * dependency, so language changes never re-trigger SW registration.
 */

function loadSource() {
  const path = fileURLToPath(new URL('./ServiceWorkerRegister.tsx', import.meta.url))
  const text = readFileSync(path, 'utf-8')
  const sourceFile = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  return { text, sourceFile }
}

/** Finds every `useEffect(fn, deps)` call in the source. */
function findUseEffectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useEffect'
    ) {
      calls.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return calls
}

/** The registration effect is identified by its body calling `.register(` on the SW container. */
function isRegistrationEffect(call: ts.CallExpression, text: string): boolean {
  const [effectFn] = call.arguments
  if (!effectFn) return false
  const body = text.slice(effectFn.getStart(), effectFn.getEnd())
  return body.includes('serviceWorker') && body.includes('.register(')
}

describe('ServiceWorkerRegister.tsx — SW registration effect shape (regression: #51 t-dependency)', () => {
  it('has exactly one useEffect that registers the service worker', () => {
    const { text, sourceFile } = loadSource()
    const registrationEffects = findUseEffectCalls(sourceFile).filter((call) =>
      isRegistrationEffect(call, text)
    )
    expect(registrationEffects).toHaveLength(1)
  })

  it('the registration effect has an empty dependency array (must run exactly once per page load)', () => {
    const { text, sourceFile } = loadSource()
    const [registrationEffect] = findUseEffectCalls(sourceFile).filter((call) =>
      isRegistrationEffect(call, text)
    )
    expect(registrationEffect).toBeDefined()

    const depsArg = registrationEffect.arguments[1]
    expect(depsArg).toBeDefined()
    expect(depsArg && ts.isArrayLiteralExpression(depsArg)).toBe(true)
    if (depsArg && ts.isArrayLiteralExpression(depsArg)) {
      // Regression guard: must be `[]`, not `[t]` (or anything else) — a
      // non-empty deps array here re-runs SW registration/listener setup
      // whenever any dependency's reference changes, which silently drops
      // in-flight update detection (see file header comment above).
      expect(depsArg.elements.length).toBe(0)
    }
  })

  it('the registration effect reads the translator via tRef.current(...), not a bare t(...) call', () => {
    const { text, sourceFile } = loadSource()
    const [registrationEffect] = findUseEffectCalls(sourceFile).filter((call) =>
      isRegistrationEffect(call, text)
    )
    const [effectFn] = registrationEffect.arguments
    const body = text.slice(effectFn.getStart(), effectFn.getEnd())

    expect(body).toContain("tRef.current('pwaUpdateRestarting')")
    // A bare `t(` call (not preceded by `.`) would mean `t` — not `tRef` —
    // is captured directly in this closure, which is exactly what made the
    // effect need `[t]` in the regression this test guards against.
    expect(body).not.toMatch(/[^.]\bt\(/)
  })

  it('tRef is kept in sync with the latest t via its own single-purpose effect', () => {
    const { text } = loadSource()
    expect(text).toMatch(/const tRef = useRef\(t\)/)
    expect(text).toMatch(/tRef\.current = t\s*\n\s*}, \[t\]\)/)
  })
})
