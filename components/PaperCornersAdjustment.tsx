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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ctx.lineWidth = 3
    ctx.fillStyle = '#f97316'

    // Draw lines connecting corners with shadow
    ctx.shadowColor = 'rgba(249, 115, 22, 0.3)'
    ctx.shadowBlur = 5
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
    ctx.shadowBlur = 0

    // Draw corner points
    corners.forEach((corner, index) => {
      const x = corner.x * scale
      const y = corner.y * scale
      const isActive = draggingIndex === index

      // Draw outer circle (glow effect)
      if (isActive) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.3)'
        ctx.beginPath()
        ctx.arc(x, y, 20, 0, 2 * Math.PI)
        ctx.fill()
      }

      // Draw main circle
      ctx.fillStyle = isActive ? '#fb923c' : '#f97316'
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, 2 * Math.PI)
      ctx.fill()

      // Draw white border
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, 2 * Math.PI)
      ctx.stroke()

      // Draw emoji label
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const emojis = ['↖️', '↗️', '↘️', '↙️']

      // Draw text shadow for better visibility
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillText(emojis[index], x + 1, y - 21)

      ctx.fillStyle = 'white'
      ctx.fillText(emojis[index], x, y - 22)
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
    <div className="space-y-4 rounded-lg bg-gradient-to-br from-orange-50 to-yellow-50 p-6 shadow-lg">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-orange-600">📄 まっすぐに直そう！</h2>
        <p className="text-base text-gray-700">
          🟠 オレンジの点を動かして、絵の4つのかどを合わせてね
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
          className="cursor-pointer rounded-lg border-4 border-orange-300 shadow-md"
          style={{ touchAction: 'none' }}
        />
      </div>

      <div className="rounded-lg bg-white p-3 text-center text-sm text-gray-600">
        💡 ヒント: 点をタッチして動かすと、絵がまっすぐになるよ！
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleReset}
          className="rounded-lg bg-gray-400 px-5 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-gray-500 hover:shadow-lg active:scale-95"
        >
          やり直し
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-blue-500 px-5 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-blue-600 hover:shadow-lg active:scale-95"
        >
          そのまま進む
        </button>
        <button
          onClick={handleApply}
          className="rounded-lg bg-orange-500 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg active:scale-95"
        >
          これでOK！
        </button>
      </div>
    </div>
  )
}
