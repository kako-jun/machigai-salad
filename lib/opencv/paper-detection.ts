import type { Point, OpenCV, Mat } from '@/types'

// Cannyエッジ検出のしきい値ペア
const CANNY_THRESHOLD_PAIRS = [
  [30, 100],
  [50, 150],
  [75, 200],
] as const

// 四角形近似のepsilon値
const APPROX_EPSILON_VALUES = [0.02, 0.03, 0.04] as const

// 最小検出面積（画像全体に対する割合）
const MIN_AREA_RATIO = 0.05
// 早期終了面積（画像全体に対する割合）
const EARLY_STOP_AREA_RATIO = 0.2

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
export function detectPaperContour(src: Mat, cv: OpenCV): Mat | null {
  // グレースケール変換
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  // ガウシアンブラーでノイズ除去
  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

  let bestContour: Mat | null = null
  let maxArea = 0
  const imageArea = src.rows * src.cols

  for (const [low, high] of CANNY_THRESHOLD_PAIRS) {
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
      if (area < imageArea * MIN_AREA_RATIO) {
        continue
      }

      // 複数のepsilonで四角形近似を試行
      const peri = cv.arcLength(contour, true)
      for (const epsilon of APPROX_EPSILON_VALUES) {
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
    }

    // クリーンアップ
    edges.delete()
    contours.delete()
    hierarchy.delete()

    // 十分大きな候補が見つかったら早期終了
    if (bestContour && maxArea > imageArea * EARLY_STOP_AREA_RATIO) {
      break
    }
  }

  // クリーンアップ
  gray.delete()
  blurred.delete()

  return bestContour
}
