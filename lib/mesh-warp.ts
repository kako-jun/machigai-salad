/**
 * 5-point mesh warp: 4 corners + 1 center point.
 * Divides the image into 4 triangles and applies an affine transform to each.
 */

import type { Point, CornerOffsets } from '@/types'

interface MeshWarpOptions {
  cornerOffsets: CornerOffsets
  centerOffset: Point
  offset: Point
  /** Image rect within the canvas (left, top from panel origin) */
  imgLeft: number
  imgTop: number
}

/**
 * Draw a mesh-warped image onto a canvas.
 * The canvas should already be sized to the panel dimensions.
 */
export function drawMeshWarp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgW: number,
  imgH: number,
  options: MeshWarpOptions
) {
  const { cornerOffsets, centerOffset, offset, imgLeft, imgTop } = options

  // Source points (image coordinate space: 0,0 to imgW,imgH)
  const sTL = { x: 0, y: 0 }
  const sTR = { x: imgW, y: 0 }
  const sBR = { x: imgW, y: imgH }
  const sBL = { x: 0, y: imgH }
  const sC = { x: imgW / 2, y: imgH / 2 }

  // Destination points (panel coordinate space, with offsets)
  const ox = offset.x + imgLeft
  const oy = offset.y + imgTop
  const dTL = { x: cornerOffsets[0].x + ox, y: cornerOffsets[0].y + oy }
  const dTR = { x: imgW + cornerOffsets[1].x + ox, y: cornerOffsets[1].y + oy }
  const dBR = { x: imgW + cornerOffsets[2].x + ox, y: imgH + cornerOffsets[2].y + oy }
  const dBL = { x: cornerOffsets[3].x + ox, y: imgH + cornerOffsets[3].y + oy }
  const dC = { x: imgW / 2 + centerOffset.x + ox, y: imgH / 2 + centerOffset.y + oy }

  // 4 triangles: each edge pair → center
  drawTexturedTriangle(ctx, img, imgW, imgH, sTL, sTR, sC, dTL, dTR, dC)
  drawTexturedTriangle(ctx, img, imgW, imgH, sTR, sBR, sC, dTR, dBR, dC)
  drawTexturedTriangle(ctx, img, imgW, imgH, sBR, sBL, sC, dBR, dBL, dC)
  drawTexturedTriangle(ctx, img, imgW, imgH, sBL, sTL, sC, dBL, dTL, dC)
}

/**
 * Draw a textured triangle by computing the affine transform from
 * source triangle → destination triangle, clipping, and drawing.
 */
function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  imgW: number,
  imgH: number,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point
) {
  // Determinant of source matrix
  const det = s0.x * (s1.y - s2.y) - s0.y * (s1.x - s2.x) + (s1.x * s2.y - s2.x * s1.y)
  if (Math.abs(det) < 1e-10) return

  const inv = 1 / det

  // Inverse of source matrix [[s0.x, s0.y, 1], [s1.x, s1.y, 1], [s2.x, s2.y, 1]]
  const i00 = (s1.y - s2.y) * inv
  const i01 = (s2.y - s0.y) * inv
  const i02 = (s0.y - s1.y) * inv
  const i10 = (s2.x - s1.x) * inv
  const i11 = (s0.x - s2.x) * inv
  const i12 = (s1.x - s0.x) * inv
  const i20 = (s1.x * s2.y - s2.x * s1.y) * inv
  const i21 = (s2.x * s0.y - s0.x * s2.y) * inv
  const i22 = (s0.x * s1.y - s1.x * s0.y) * inv

  // Affine matrix: ctx.setTransform(a, b, c, d, e, f)
  // Maps source (x,y) → destination (a*x + c*y + e, b*x + d*y + f)
  const a = d0.x * i00 + d1.x * i01 + d2.x * i02
  const c = d0.x * i10 + d1.x * i11 + d2.x * i12
  const e = d0.x * i20 + d1.x * i21 + d2.x * i22
  const b = d0.y * i00 + d1.y * i01 + d2.y * i02
  const d = d0.y * i10 + d1.y * i11 + d2.y * i12
  const f = d0.y * i20 + d1.y * i21 + d2.y * i22

  ctx.save()

  // Clip to destination triangle
  ctx.beginPath()
  ctx.moveTo(d0.x, d0.y)
  ctx.lineTo(d1.x, d1.y)
  ctx.lineTo(d2.x, d2.y)
  ctx.closePath()
  ctx.clip()

  // Apply affine transform and draw the full image
  ctx.setTransform(a, b, c, d, e, f)
  ctx.drawImage(img, 0, 0, imgW, imgH)

  ctx.restore()
}
