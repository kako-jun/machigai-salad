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
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const effectiveInitialCorners = initialCorners ?? getDefaultCorners(imageSize)
  const [corners, setCorners] = useState<Point[]>(effectiveInitialCorners)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [scale, setScale] = useState(1)

  // 画像の読み込みとキャンバスサイズ設定（imageDataUrl が変わった時のみ）
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

      loadedImageRef.current = img
      canvas.width = img.width * newScale
      canvas.height = img.height * newScale
      setScale(newScale)
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  // corners・draggingIndex・scale が変わったときに再描画
  useEffect(() => {
    const img = loadedImageRef.current
    if (!img) return
    drawCanvas(img, corners, scale, draggingIndex)
  }, [corners, draggingIndex, scale])

  const drawCanvas = (
    img: HTMLImageElement,
    corners: Point[],
    scale: number,
    activeIndex: number | null
  ) => {
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
    ctx.strokeStyle = 'rgba(245, 197, 24, 0.85)'
    ctx.lineWidth = 2.5
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
      const isActive = activeIndex === index

      // Outer ring when active
      if (isActive) {
        ctx.strokeStyle = 'rgba(245, 197, 24, 0.4)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(x, y, 18, 0, 2 * Math.PI)
        ctx.stroke()
      }

      // Handle dot
      ctx.fillStyle = isActive ? '#D4A010' : '#F5C518'
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
      {/* Instruction tip styled like a menu note */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-2.5"
        style={{
          background: 'rgba(245,197,24,0.1)',
          border: '1px solid rgba(212,160,16,0.3)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          かどの まるを うごかして 紙にあわせてね
        </p>
        <button
          onClick={handleReset}
          className="ml-2 flex-shrink-0 rounded-lg px-2 py-1 text-xs"
          style={{ color: 'var(--muted)', border: '1px solid var(--border-light)' }}
          title="かどの位置をもどす"
        >
          リセット
        </button>
      </div>

      {/* Canvas with placemat-style frame */}
      <div className="flex justify-center">
        <div
          className="inline-flex p-1"
          style={{
            background: 'linear-gradient(145deg, #FFF8E7, #FDF3D8)',
            border: '2px solid var(--border)',
            borderRadius: 16,
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(180,130,60,0.2) inset, 0 4px 16px rgba(60,36,21,0.12)',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-pointer"
            style={{ touchAction: 'none', borderRadius: 10 }}
          />
        </div>
      </div>

      {/* Button row */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-ghost flex-1 px-4 py-3 text-sm">
          やめる
        </button>
        <button onClick={handleApply} className="btn-action flex-[1.5] px-4 py-3 text-sm">
          OK! すすむ
        </button>
      </div>
    </div>
  )
}
