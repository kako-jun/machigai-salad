'use client'

import { useState, useEffect } from 'react'
import { loadAllSaves, deleteSave, formatSaveDate } from '@/lib/storage'
import type { SaveEntry } from '@/lib/storage'

interface SavesPopupProps {
  open: boolean
  onClose: () => void
  onLoad: (entry: SaveEntry) => void
}

export default function SavesPopup({ open, onClose, onLoad }: SavesPopupProps) {
  const [saves, setSaves] = useState<SaveEntry[]>([])

  useEffect(() => {
    if (open) {
      setSaves(loadAllSaves())
    }
  }, [open])

  if (!open) return null

  const handleDelete = (id: string) => {
    deleteSave(id)
    setSaves((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(60,36,21,0.4)' }}
      onClick={onClose}
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
            ほぞんしたやつ
          </span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
            style={{ color: 'var(--muted)', background: 'var(--border-light)' }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 52px)' }}>
          {saves.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
              まだないよ
            </p>
          ) : (
            saves.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-light)' }}
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.originalImage}
                  alt=""
                  className="h-12 w-12 flex-shrink-0 rounded object-cover"
                  style={{ border: '1px solid var(--border-light)' }}
                />

                {/* Date label — tappable to load */}
                <button
                  className="flex-1 text-left text-sm font-medium"
                  style={{ color: 'var(--espresso)' }}
                  onClick={() => onLoad(entry)}
                >
                  {formatSaveDate(entry.savedAt)}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs"
                  style={{ color: 'var(--muted)', background: 'var(--border-light)' }}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
