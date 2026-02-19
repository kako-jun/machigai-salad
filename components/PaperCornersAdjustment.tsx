'use client'

import { useState, useRef, useEffect } from 'react'
import type { Point } from '@/types'

interface PaperCornersAdjustmentProps {
  imageDataUrl: string
  /** 自動検出結果（nullの場合はデフォルト位置を使う） */
  initialCorners: Point[] | null
  /** 元画像のサイズ（デフォルト角の計算に使う） */
  imageSize: { width: number; height: number }
  onApply: (corners: Point[]) => void
  onCancel: () => void
}

function getDefaultCorners(imageSize: { width: number; height: number }): Point[] {
  const marginX = imageSize.width * 0.1
  const marginY = imageSize.height * 0.1
  return [
    { x: marginX, y: marginY },
    { x: imageSize.width - marginX, y: marginY },
    { x: imageSize.width - marginX, y: imageSize.height - marginY },
    { x: marginX, y: imageSize.height - marginY },
  ]
}

export default function PaperCornersAdjustment({
  imageDataUrl,
  initialCorners,
  imageSize,
  onApply,
  onCancel,
}: PaperCornersAdjustmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const effectiveInitialCorners = initialCorners ?? getDefaultCorners(imageSize)
  const [corners, setCorners] = useState<Point[]>(effectiveInitialCorners)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const hasAutoDetection = initialCorners !== null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()
    img.onload = () => {
      const maxWidth = Math.min(800, window.innerWidth - 32)
      const maxHeight = Math.min(600, window.innerHeight - 200)
      const scaleX = maxWidth / img.width
      const scaleY = maxHeight / img.height
      const newScale = Math.min(scaleX, scaleY, 1)

      setScale(newScale)
      canvas.width = img.width * newScale
      canvas.height = img.height * newScale

      drawCanvas(img, corners, newScale)
    }
    img.src = imageDataUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl, corners])

  const drawCanvas = (img: HTMLImageElement, corners: Point[], scale: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Semi-transparent overlay outside the selected region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Cut out the selected region
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Redraw image inside the region
    ctx.save()
    ctx.beginPath()
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    // Draw border lines
    ctx.strokeStyle = 'rgba(232, 86, 58, 0.7)'
    ctx.lineWidth = 2
    ctx.beginPath()
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.stroke()

    // Draw corner handles
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      const isActive = draggingIndex === index

      // Outer ring when active
      if (isActive) {
        ctx.strokeStyle = 'rgba(232, 86, 58, 0.3)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 18, 0, 2 * Math.PI)
        ctx.stroke()
      }

      // Handle dot
      ctx.fillStyle = isActive ? '#d44a30' : '#e8563a'
      ctx.beginPath()
      ctx.arc(x, y, isActive ? 10 : 8, 0, 2 * Math.PI)
      ctx.fill()

      // White border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, isActive ? 10 : 8, 0, 2 * Math.PI)
      ctx.stroke()
    })
  }

  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) / scale
    const y = (clientY - rect.top) / scale

    return { x, y }
  }

  const findCornerAtPoint = (point: Point): number | null => {
    const threshold = 25 / scale
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i]
      const dx = corner.x - point.x
      const dy = corner.y - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < threshold) {
        return i
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY)
    const index = findCornerAtPoint(point)
    if (index !== null) {
      setDraggingIndex(index)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return

    const point = getCanvasPoint(e.clientX, e.clientY)
    point.x = Math.max(0, Math.min(imageSize.width, point.x))
    point.y = Math.max(0, Math.min(imageSize.height, point.y))

    const newCorners = [...corners]
    newCorners[draggingIndex] = point
    setCorners(newCorners)
  }

  const handleMouseUp = () => {
    setDraggingIndex(null)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    const index = findCornerAtPoint(point)
    if (index !== null) {
      setDraggingIndex(index)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (draggingIndex === null) return

    const touch = e.touches[0]
    const point = getCanvasPoint(touch.clientX, touch.clientY)
    point.x = Math.max(0, Math.min(imageSize.width, point.x))
    point.y = Math.max(0, Math.min(imageSize.height, point.y))

    const newCorners = [...corners]
    newCorners[draggingIndex] = point
    setCorners(newCorners)
  }

  const handleTouchEnd = () => {
    setDraggingIndex(null)
  }

  const handleReset = () => {
    setCorners(effectiveInitialCorners)
  }

  const handleApply = () => {
    onApply(corners)
  }

  return (
    <div className="animate-fade-in space-y-4">
      <p className="text-center text-sm text-muted">
        {hasAutoDetection
          ? '自どうで みつけたよ。ずれてたら なおしてね'
          : 'かどの まるを うごかして 紙にあわせてね'}
      </p>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="cursor-pointer rounded-xl shadow-sm"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-all hover:bg-surface-hover active:scale-[0.97]"
        >
          もどす
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted transition-all hover:bg-surface-hover active:scale-[0.97]"
        >
          やめる
        </button>
        <button
          onClick={handleApply}
          className="flex-[1.5] rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.97]"
        >
          OK! すすむ
        </button>
      </div>
    </div>
  )
}
