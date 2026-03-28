import type { Point } from '@/types'

const STORAGE_KEY = 'machigai-salad-saves'
const MAX_SAVES = 5

export interface SaveEntry {
  id: string
  savedAt: string // ISO string
  originalImage: string // data URL
  corners: Point[]
  offset: { x: number; y: number }
  imageSize: { width: number; height: number }
}

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

export function loadAllSaves(): SaveEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry)
  } catch {
    return []
  }
}

export function addSave(entry: Omit<SaveEntry, 'id' | 'savedAt'>): SaveEntry | null {
  try {
    const saves = loadAllSaves()
    const now = new Date()
    const newEntry: SaveEntry = {
      ...entry,
      id: crypto.randomUUID(),
      savedAt: now.toISOString(),
    }
    saves.unshift(newEntry)
    while (saves.length > MAX_SAVES) {
      saves.pop()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves))
    return newEntry
  } catch {
    return null
  }
}

export function deleteSave(id: string): boolean {
  try {
    const saves = loadAllSaves().filter((s) => s.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves))
    return true
  } catch {
    return false
  }
}

export function formatSaveDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
