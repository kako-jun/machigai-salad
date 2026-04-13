'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { loadAllSaves, deleteSave, formatSaveDate } from '@/lib/storage'
import type { SaveEntry } from '@/lib/storage'

interface SavesPopupProps {
  open: boolean
  onClose: () => void
  onLoad: (entry: SaveEntry) => void
}

export default function SavesPopup({ open, onClose, onLoad }: SavesPopupProps) {
  const [saves, setSaves] = useState<SaveEntry[]>([])
  const { t } = useI18n()

  useEffect(() => {
    if (open) {
      setSaves(loadAllSaves())
    }
  }, [open])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm(t('deleteConfirm'))) return
    if (!deleteSave(id)) return
    setSaves((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(60,36,21,0.4)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('savesTitle')}
    >
      <div
        className="mx-4 max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          background: 'var(--parchment)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(60,36,21,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <span className="text-sm font-bold" style={{ color: 'var(--espresso)' }}>
            {t('savesTitle')}
          </span>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm"
            style={{ color: 'var(--muted)', background: 'var(--border-light)' }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 56px)' }}>
          <p className="whitespace-pre-line px-4 pt-2 text-xs" style={{ color: 'var(--muted)' }}>
            {t('savesLimit')}
          </p>
          {saves.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
              {t('savesEmpty')}
            </p>
          ) : (
            saves.map((entry) => (
              <div
                key={entry.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 active:opacity-70"
                style={{ borderBottom: '1px solid var(--border-light)' }}
                onClick={() => onLoad(entry)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onLoad(entry)
                }}
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.originalImage}
                  alt=""
                  className="h-12 w-12 flex-shrink-0 rounded object-cover"
                  style={{ border: '1px solid var(--border-light)' }}
                />

                {/* Date label */}
                <span
                  className="flex-1 text-left text-sm font-medium"
                  style={{ color: 'var(--espresso)' }}
                >
                  {formatSaveDate(entry.savedAt)}
                </span>

                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(e, entry.id)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ color: 'var(--muted)', background: 'var(--border-light)' }}
                  aria-label={t('deleteBtn')}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
