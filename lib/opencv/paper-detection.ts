import type { Point, OpenCV, Mat } from '@/types'

export type DetectionSensitivity = 'strict' | 'normal' | 'loose'

const SENSITIVITY_CONFIGS: Record<
  DetectionSensitivity,
  {
    cannyPairs: readonly (readonly [number, number])[]
    epsilons: readonly number[]
    minAreaRatio: number
    earlyStopRatio: number
    blurSize: number
  }
> = {
  strict: {
    cannyPairs: [
      [80, 220],
      [100, 250],
    ],
    epsilons: [0.015, 0.02],
    minAreaRatio: 0.15,
    earlyStopRatio: 0.3,
    blurSize: 3,
  },
  normal: {
    cannyPairs: [
      [15, 60],
      [30, 100],
      [50, 150],
    ],
    epsilons: [0.03, 0.05, 0.08],
    minAreaRatio: 0.02,
    earlyStopRatio: 0.1,
    blurSize: 7,
  },
  loose: {
    cannyPairs: [
      [3, 10],
      [5, 20],
      [10, 40],
      [20, 70],
    ],
    epsilons: [0.05, 0.08, 0.12, 0.15],
    minAreaRatio: 0.005,
    earlyStopRatio: 0.03,
    blurSize: 11,
  },
}

/**
 * 4つの角を左上、右上、右下、左下の順に並べ替える
 */
export function orderPoints(pts: Mat): Point[] {
  const rect: Point[] = []
  for (let i = 0; i < 4; i++) {
    rect.push({ x: pts.data32S[i * 2], y: pts.data32S[i * 2 + 1] })
  }

  // Y座標でソート
  rect.sort((a, b) => a.y - b.y)

  // 上の2点をX座標でソート
  const top = rect.slice(0, 2).sort((a, b) => a.x - b.x)
  // 下の2点をX座標でソート
  const bottom = rect.slice(2, 4).sort((a, b) => a.x - b.x)

  // 左上、右上、右下、左下の順
  return [top[0], top[1], bottom[1], bottom[0]]
}

/**
 * Point配列をOpenCVのMatに変換
 */
export function cornersToMat(corners: Point[], cv: OpenCV): Mat {
  return cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x,
    corners[0].y,
    corners[1].x,
    corners[1].y,
    corners[2].x,
    corners[2].y,
    corners[3].x,
    corners[3].y,
  ])
}

/**
 * 画像から紙の輪郭を検出する
 */
export function detectPaperContour(
  src: Mat,
  cv: OpenCV,
  sensitivity: DetectionSensitivity = 'normal'
): Mat | null {
  const config = SENSITIVITY_CONFIGS[sensitivity]

  // グレースケール変換
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  // ガウシアンブラーでノイズ除去
  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(config.blurSize, config.blurSize), 0)

  let bestContour: Mat | null = null
  let maxArea = 0
  const imageArea = src.rows * src.cols

  for (const [low, high] of config.cannyPairs) {
    // Cannyエッジ検出
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, low, high)

    // 輪郭抽出
    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    // 最大の四角形を探す
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      // 小さすぎる輪郭はスキップ
      if (area < imageArea * config.minAreaRatio) {
        contour.delete()
        continue
      }

      // 複数のepsilonで四角形近似を試行
      const peri = cv.arcLength(contour, true)
      for (const epsilon of config.epsilons) {
        const approx = new cv.Mat()
        cv.approxPolyDP(contour, approx, epsilon * peri, true)

        // 4つの角を持ち、これまでで最大の面積
        if (approx.rows === 4 && area > maxArea) {
          maxArea = area
          if (bestContour) bestContour.delete()
          bestContour = approx.clone()
        }
        approx.delete()
      }
      contour.delete()
    }

    // クリーンアップ
    edges.delete()
    contours.delete()
    hierarchy.delete()

    // 十分大きな候補が見つかったら早期終了
    if (bestContour && maxArea > imageArea * config.earlyStopRatio) {
      break
    }
  }

  // クリーンアップ
  gray.delete()
  blurred.delete()

  return bestContour
}
