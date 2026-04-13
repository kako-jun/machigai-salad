import type { Point, CornerOffsets } from '@/types'
import type { Lang } from './i18n'

const STORAGE_KEY = 'machigai-salad'
const MAX_SAVES = 5

/** Root shape stored under the single localStorage key */
interface StorageRoot {
  saves: SaveEntry[]
  lang?: Lang
}

export interface SaveEntry {
  id: string
  savedAt: string // ISO string
  originalImage: string // data URL
  corners: Point[]
  offset: { x: number; y: number }
  imageSize: { width: number; height: number }
  warpCorners: CornerOffsets
  centerOffset: Point
  twoImageMode?: boolean
  rightImageData?: string
  secondCorners?: Point[]
}

const ZERO_CORNERS: CornerOffsets = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
]

function isValidEntry(s: unknown): s is SaveEntry {
  return (
    typeof s === 'object' &&
    s !== null &&
    'id' in s &&
    'originalImage' in s &&
    'corners' in s &&
    Array.isArray((s as SaveEntry).corners)
  )
}

/** Ensure all fields exist (migrate old saves missing warpCorners/centerOffset) */
function normalize(entry: SaveEntry): SaveEntry {
  return {
    ...entry,
    warpCorners: entry.warpCorners ?? ZERO_CORNERS,
    centerOffset: entry.centerOffset ?? { x: 0, y: 0 },
    twoImageMode: entry.twoImageMode ?? false,
  }
}

// ── low-level helpers ──

function readRoot(): StorageRoot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { saves: [] }
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { saves: [] }
    }
    return {
      saves: Array.isArray(parsed.saves) ? parsed.saves.filter(isValidEntry).map(normalize) : [],
      lang: parsed.lang === 'ja' || parsed.lang === 'en' ? parsed.lang : undefined,
    }
  } catch {
    return { saves: [] }
  }
}

function writeRoot(root: StorageRoot): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root))
    return true
  } catch {
    return false
  }
}

// ── saves ──

export function loadAllSaves(): SaveEntry[] {
  return readRoot().saves
}

export function addSave(entry: Omit<SaveEntry, 'id' | 'savedAt'>): SaveEntry | null {
  try {
    const root = readRoot()
    const now = new Date()
    const newEntry: SaveEntry = {
      ...entry,
      id: crypto.randomUUID(),
      savedAt: now.toISOString(),
    }
    root.saves.unshift(newEntry)
    while (root.saves.length > MAX_SAVES) {
      root.saves.pop()
    }
    if (!writeRoot(root)) return null
    return newEntry
  } catch {
    return null
  }
}

export function updateSave(id: string, data: Omit<SaveEntry, 'id' | 'savedAt'>): SaveEntry | null {
  try {
    const root = readRoot()
    const idx = root.saves.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const updated: SaveEntry = { ...data, id, savedAt: new Date().toISOString() }
    root.saves.splice(idx, 1)
    root.saves.unshift(updated)
    if (!writeRoot(root)) return null
    return updated
  } catch {
    return null
  }
}

export function deleteSave(id: string): boolean {
  try {
    const root = readRoot()
    root.saves = root.saves.filter((s) => s.id !== id)
    writeRoot(root)
    return true
  } catch {
    return false
  }
}

// ── lang ──

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
