import { describe, it, expect } from 'vitest'
import { orderPoints, cornersToMat } from '@/lib/opencv/paper-detection'
import type { Mat, OpenCV, Point } from '@/types'

/**
 * Characterization tests for the pure (OpenCV-independent) helpers in
 * paper-detection.ts. Production code is unchanged.
 *
 * `orderPoints` only reads `data32S` (an Int32Array of 8 values = 4 (x,y)
 * pairs), so it can be exercised with a minimal stub Mat. `cornersToMat`
 * only calls `cv.matFromArray`, so a stub `cv` captures the exact array
 * layout it constructs.
 */

/** Build a stub Mat whose data32S holds the given (x,y) point pairs. */
function matFromPoints(points: Array<[number, number]>): Mat {
  const flat: number[] = []
  for (const [x, y] of points) {
    flat.push(x, y)
  }
  return { data32S: Int32Array.from(flat) } as unknown as Mat
}

describe('orderPoints', () => {
  it('returns points as [top-left, top-right, bottom-right, bottom-left]', () => {
    // Input order deliberately scrambled.
    const pts = matFromPoints([
      [100, 100], // bottom-right
      [0, 0], // top-left
      [0, 100], // bottom-left
      [100, 0], // top-right
    ])
    expect(orderPoints(pts)).toEqual<Point[]>([
      { x: 0, y: 0 }, // TL
      { x: 100, y: 0 }, // TR
      { x: 100, y: 100 }, // BR
      { x: 0, y: 100 }, // BL
    ])
  })

  it('orders a rotated/skewed quad by y then x', () => {
    // A slightly skewed paper: two clearly-upper points, two clearly-lower.
    const pts = matFromPoints([
      [30, 90], // lower-left
      [110, 20], // upper-right
      [10, 10], // upper-left
      [120, 100], // lower-right
    ])
    expect(orderPoints(pts)).toEqual<Point[]>([
      { x: 10, y: 10 }, // TL
      { x: 110, y: 20 }, // TR
      { x: 120, y: 100 }, // BR
      { x: 30, y: 90 }, // BL
    ])
  })

  it('only consumes the first 4 points even if more data is present', () => {
    const pts = matFromPoints([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [999, 999], // extra, must be ignored
    ])
    expect(orderPoints(pts)).toEqual<Point[]>([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
  })

  it('quirk: with all four points on the same y, the split is the first-two vs last-two by x', () => {
    // y-sort is stable (Array.prototype.sort is stable), so order is preserved
    // on the y tie; then "top" = first two as given, "bottom" = last two.
    // Input x order: 50, 10, 40, 20.
    // top  = [50,10] sorted by x -> [10, 50]  => TL=10, TR=50
    // bot  = [40,20] sorted by x -> [20, 40]  => BR=40, BL=20
    const pts = matFromPoints([
      [50, 5],
      [10, 5],
      [40, 5],
      [20, 5],
    ])
    expect(orderPoints(pts)).toEqual<Point[]>([
      { x: 10, y: 5 }, // TL
      { x: 50, y: 5 }, // TR
      { x: 40, y: 5 }, // BR
      { x: 20, y: 5 }, // BL
    ])
  })

  it('handles negative coordinates', () => {
    const pts = matFromPoints([
      [-100, -100], // TL
      [100, -100], // TR
      [100, 100], // BR
      [-100, 100], // BL
    ])
    expect(orderPoints(pts)).toEqual<Point[]>([
      { x: -100, y: -100 },
      { x: 100, y: -100 },
      { x: 100, y: 100 },
      { x: -100, y: 100 },
    ])
  })
})

describe('cornersToMat', () => {
  it('flattens corners into matFromArray(4, 1, CV_32FC2, [x0,y0,...,x3,y3])', () => {
    const calls: Array<{ rows: number; cols: number; type: number; data: number[] }> = []
    const SENTINEL_MAT = {} as Mat
    const cv = {
      CV_32FC2: 13, // arbitrary sentinel; only identity matters
      matFromArray(rows: number, cols: number, type: number, data: number[]): Mat {
        calls.push({ rows, cols, type, data })
        return SENTINEL_MAT
      },
    } as unknown as OpenCV

    const corners: Point[] = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
      { x: 7, y: 8 },
    ]
    const result = cornersToMat(corners, cv)

    expect(result).toBe(SENTINEL_MAT)
    expect(calls).toHaveLength(1)
    expect(calls[0].rows).toBe(4)
    expect(calls[0].cols).toBe(1)
    expect(calls[0].type).toBe(13) // cv.CV_32FC2 passed through
    expect(calls[0].data).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
