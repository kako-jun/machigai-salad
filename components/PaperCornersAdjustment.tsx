'use client'

import { useState, useRef, useEffect } from 'react'

interface Point {
  x: number
  y: number
}

interface PaperCornersAdjustmentProps {
  imageDataUrl: string
  initialCorners: Point[]
  onApply: (corners: Point[]) => void
  onCancel: () => void
}

export default function PaperCornersAdjustment({
  imageDataUrl,
  initialCorners,
  onApply,
  onCancel,
}: PaperCornersAdjustmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [corners, setCorners] = useState<Point[]>(initialCorners)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()
    img.onload = () => {
      // Calculate scale to fit canvas
      const maxWidth = Math.min(800, window.innerWidth - 40)
      const maxHeight = Math.min(600, window.innerHeight - 200)
      const scaleX = maxWidth / img.width
      const scaleY = maxHeight / img.height
      const scale = Math.min(scaleX, scaleY, 1)

      setScale(scale)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      setImageSize({ width: img.width, height: img.height })

      drawCanvas(img, corners, scale)
    }
    img.src = imageDataUrl
  }, [imageDataUrl, corners])

  const drawCanvas = (img: HTMLImageElement, corners: Point[], scale: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw corners and lines
    ctx.strokeStyle = '#f97316' // orange
    ctx.lineWidth = 2
    ctx.fillStyle = '#f97316'

    // Draw lines connecting corners
    ctx.beginPath()
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.closePath()
    ctx.stroke()

    // Draw corner points
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale

      ctx.beginPath()
      ctx.arc(x, y, 10, 0, 2 * Math.PI)
      ctx.fill()

      // Draw label
      ctx.fillStyle = 'white'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const labels = ['左上', '右上', '右下', '左下']
      ctx.fillText(labels[index], x, y)
      ctx.fillStyle = '#f97316'
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
    const threshold = 20 / scale
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

    // Clamp to image bounds
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

    // Clamp to image bounds
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
    setCorners(initialCorners)
  }

  const handleApply = () => {
    onApply(corners)
  }

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-lg">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-800">紙の範囲を調整</h2>
        <p className="text-sm text-gray-600">
          オレンジ色の点をドラッグして、紙の4つの角を調整してください
        </p>
      </div>

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
          className="cursor-pointer border-2 border-gray-300"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={handleReset}
          className="rounded-lg bg-gray-500 px-6 py-3 text-white transition-colors hover:bg-gray-600"
        >
          リセット
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-red-500 px-6 py-3 text-white transition-colors hover:bg-red-600"
        >
          キャンセル
        </button>
        <button
          onClick={handleApply}
          className="rounded-lg bg-orange-500 px-6 py-3 text-white transition-colors hover:bg-orange-600"
        >
          適用
        </button>
      </div>
    </div>
  )
}
