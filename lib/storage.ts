import { createStore, get, set, del, keys as idbKeys, getMany } from 'idb-keyval'
import type { UseStore } from 'idb-keyval'
import type { Point, CornerOffsets } from '@/types'
import type { Lang } from './i18n'

/** localStorage key for non-saves state (currently lang only) */
const STORAGE_KEY = 'machigai-salad'
const MAX_SAVES = 5

/** Root shape stored under the single localStorage key (saves moved to IDB) */
interface StorageRoot {
  lang?: Lang
}

export interface SaveEntry {
  id: string
  savedAt: string // ISO string
  originalImage: Blob
  corners: Point[]
  offset: { x: number; y: number }
  imageSize: { width: number; height: number }
  warpCorners: CornerOffsets
  centerOffset: Point
  twoImageMode?: boolean
  rightImageData?: Blob
  secondCorners?: Point[]
}

const ZERO_CORNERS: CornerOffsets = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

// ── IDB store ──

/**
 * Lazily-initialized IDB custom store. Deferred so SSR / non-browser environments
 * don't touch `indexedDB` at import time.
 */
let _store: UseStore | null = null
function store(): UseStore {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB unavailable')
  if (!_store) _store = createStore('machigai-salad', 'saves')
  return _store
}

function isValidEntry(s: unknown): s is SaveEntry {
  if (typeof s !== 'object' || s === null) return false
  const e = s as SaveEntry
  return (
    typeof e.id === 'string' &&
    typeof e.savedAt === 'string' &&
    e.originalImage instanceof Blob &&
    Array.isArray(e.corners)
  )
}

/** Ensure all fields exist on an entry loaded from IDB */
function normalize(entry: SaveEntry): SaveEntry {
  return {
    ...entry,
    warpCorners: entry.warpCorners ?? ZERO_CORNERS,
    centerOffset: entry.centerOffset ?? { x: 0, y: 0 },
    twoImageMode: entry.twoImageMode ?? false,
  }
}

// ── localStorage root (lang only) ──

function readRoot(): StorageRoot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    // Drop legacy `saves` field (moved to IndexedDB)
    if ('saves' in parsed) {
      const { saves: _drop, ...rest } = parsed
      void _drop
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
      return {
        lang: rest.lang === 'ja' || rest.lang === 'en' ? rest.lang : undefined,
      }
    }
    return {
      lang: parsed.lang === 'ja' || parsed.lang === 'en' ? parsed.lang : undefined,
    }
  } catch {
    return {}
  }
}

function writeRoot(root: StorageRoot): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root))
    return true
  } catch (e) {
    console.error('[machigai-salad] localStorage write failed:', e)
    return false
  }
}

// ── saves (IDB) ──

export async function loadAllSaves(): Promise<SaveEntry[]> {
  if (typeof window === 'undefined') return []
  try {
    const ks = await idbKeys(store())
    if (ks.length === 0) return []
    const values = await getMany<SaveEntry | undefined>(ks as IDBValidKey[], store())
    const entries = values.filter(isValidEntry).map(normalize)
    // savedAt DESC (newest first)
    entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    return entries
  } catch (e) {
    console.error('[machigai-salad] IDB loadAllSaves failed:', e)
    return []
  }
}

export async function addSave(entry: Omit<SaveEntry, 'id' | 'savedAt'>): Promise<SaveEntry | null> {
  if (typeof window === 'undefined') return null
  try {
    const now = new Date()
    const newEntry: SaveEntry = {
      ...entry,
      id: crypto.randomUUID(),
      savedAt: now.toISOString(),
    }
    await set(newEntry.id, newEntry, store())
    // Enforce MAX_SAVES by deleting oldest extras
    const all = await loadAllSaves()
    if (all.length > MAX_SAVES) {
      const extras = all.slice(MAX_SAVES)
      await Promise.all(extras.map((e) => del(e.id, store())))
    }
    return newEntry
  } catch (e) {
    console.error('[machigai-salad] IDB addSave failed:', e)
    return null
  }
}

export async function updateSave(
  id: string,
  data: Omit<SaveEntry, 'id' | 'savedAt'>
): Promise<SaveEntry | null> {
  if (typeof window === 'undefined') return null
  try {
    const existing = await get<SaveEntry>(id, store())
    if (!existing) return null
    const updated: SaveEntry = { ...data, id, savedAt: new Date().toISOString() }
    await set(id, updated, store())
    return updated
  } catch (e) {
    console.error('[machigai-salad] IDB updateSave failed:', e)
    return null
  }
}

export async function deleteSave(id: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    await del(id, store())
    return true
  } catch (e) {
    console.error('[machigai-salad] IDB deleteSave failed:', e)
    return false
  }
}

// ── lang (localStorage) ──

export function loadLang(): Lang | undefined {
  return readRoot().lang
}

export function saveLang(lang: Lang): void {
  const root = readRoot()
  root.lang = lang
  writeRoot(root)
}

// ── util ──

export function formatSaveDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
