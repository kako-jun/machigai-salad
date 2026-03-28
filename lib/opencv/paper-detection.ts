import type { Point, OpenCV, Mat } from '@/types'

export type DetectionSensitivity = 'strict' | 'normal' | 'loose'

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
 * Canny + findContours で最大の四角形を検出する（基本戦略）
 */
function findBestQuad(
  gray: Mat,
  cv: OpenCV,
  cannyPairs: readonly (readonly [number, number])[],
  epsilons: readonly number[],
  minAreaRatio: number,
  earlyStopRatio: number,
  blurSize: number
): Mat | null {
  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(blurSize, blurSize), 0)

  let bestContour: Mat | null = null
  let maxArea = 0
  const imageArea = gray.rows * gray.cols

  for (const [low, high] of cannyPairs) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, low, high)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      if (area < imageArea * minAreaRatio) {
        contour.delete()
        continue
      }

      const peri = cv.arcLength(contour, true)
      for (const epsilon of epsilons) {
        const approx = new cv.Mat()
        cv.approxPolyDP(contour, approx, epsilon * peri, true)

        if (approx.rows === 4 && area > maxArea) {
          maxArea = area
          if (bestContour) bestContour.delete()
          bestContour = approx.clone()
        }
        approx.delete()
      }
      contour.delete()
    }

    edges.delete()
    contours.delete()
    hierarchy.delete()

    if (bestContour && maxArea > imageArea * earlyStopRatio) {
      break
    }
  }

  blurred.delete()
  return bestContour
}

/**
 * 複数の四角形候補を全て検出し、それらを包含する外接矩形を返す
 * 左右の絵が別々に検出される場合に、全体を囲む矩形を得る
 */
function findBoundingQuad(gray: Mat, cv: OpenCV): Mat | null {
  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

  const imageArea = gray.rows * gray.cols
  let minX = gray.cols
  let minY = gray.rows
  let maxX = 0
  let maxY = 0
  let foundAny = false

  // 複数の Canny 設定で四角形を探し、全ての角の座標を集約
  const cannyPairs: [number, number][] = [
    [10, 40],
    [30, 100],
    [50, 150],
    [80, 200],
  ]
  const epsilons = [0.02, 0.04, 0.08, 0.12]

  for (const [low, high] of cannyPairs) {
    const edges = new cv.Mat()
    cv.Canny(blurred, edges, low, high)

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)
      const area = cv.contourArea(contour)

      // ごく小さい輪郭は無視（ノイズ除去）
      if (area < imageArea * 0.005) {
        contour.delete()
        continue
      }

      const peri = cv.arcLength(contour, true)
      for (const epsilon of epsilons) {
        const approx = new cv.Mat()
        cv.approxPolyDP(contour, approx, epsilon * peri, true)

        // 3〜6角形を四角形候補として受け入れる（台形なども拾う）
        if (approx.rows >= 3 && approx.rows <= 6 && area > imageArea * 0.01) {
          for (let j = 0; j < approx.rows; j++) {
            const px = approx.data32S[j * 2]
            const py = approx.data32S[j * 2 + 1]
            minX = Math.min(minX, px)
            minY = Math.min(minY, py)
            maxX = Math.max(maxX, px)
            maxY = Math.max(maxY, py)
            foundAny = true
          }
        }
        approx.delete()
      }
      contour.delete()
    }

    edges.delete()
    contours.delete()
    hierarchy.delete()
  }

  blurred.delete()

  if (!foundAny) return null

  const boundW = maxX - minX
  const boundH = maxY - minY

  // 外接矩形が画像のほぼ全体（95%以上）なら検出失敗とみなす
  if (boundW > gray.cols * 0.95 && boundH > gray.rows * 0.95) return null
  // あまりに小さい場合も失敗
  if (boundW * boundH < imageArea * 0.03) return null

  // 片側検出の補正: 検出領域が画像の左半分または右半分に偏っている場合、
  // 間違い探しの紙は左右対称なので、反対側にミラーして全体の矩形を推測する
  const imgCenterX = gray.cols / 2
  const boundCenterX = (minX + maxX) / 2

  if (boundW < gray.cols * 0.55) {
    // 検出領域が画像幅の55%未満 → 片側のみ検出された可能性
    if (boundCenterX < imgCenterX * 0.8) {
      // 左側に偏っている → 右に同じ幅を伸ばす
      maxX = Math.min(gray.cols, minX + boundW * 2)
    } else if (boundCenterX > imgCenterX * 1.2) {
      // 右側に偏っている → 左に同じ幅を伸ばす
      minX = Math.max(0, maxX - boundW * 2)
    }
  }

  // 外接矩形の4隅を Mat として返す
  return cv.matFromArray(4, 1, cv.CV_32FC2, [minX, minY, maxX, minY, maxX, maxY, minX, maxY])
}

/**
 * 画像から紙の輪郭を検出する
 *
 * strict: 高閾値 Canny（くっきりした紙のみ）
 * normal: 中閾値 Canny + 反転画像でも試行
 * loose:  複数の四角形候補を統合し、外接矩形を返す
 */
export function detectPaperContour(
  src: Mat,
  cv: OpenCV,
  sensitivity: DetectionSensitivity = 'normal'
): Mat | null {
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  let result: Mat | null = null

  if (sensitivity === 'strict') {
    result = findBestQuad(
      gray,
      cv,
      [
        [80, 220],
        [100, 250],
      ],
      [0.015, 0.02],
      0.1,
      0.25,
      3
    )
  } else if (sensitivity === 'normal') {
    // 通常の検出
    result = findBestQuad(
      gray,
      cv,
      [
        [20, 80],
        [40, 130],
        [60, 180],
      ],
      [0.02, 0.04, 0.06],
      0.03,
      0.15,
      5
    )

    // 失敗したらブラーサイズを大きく変えて再試行
    if (!result) {
      result = findBestQuad(
        gray,
        cv,
        [
          [10, 50],
          [20, 80],
          [40, 130],
        ],
        [0.03, 0.06, 0.1],
        0.02,
        0.1,
        11
      )
    }
  } else {
    // loose: 全ての四角形候補を集めて外接矩形を返す
    result = findBoundingQuad(gray, cv)

    // 外接矩形も失敗なら通常の甘い検出にフォールバック
    if (!result) {
      result = findBestQuad(
        gray,
        cv,
        [
          [5, 20],
          [15, 50],
          [30, 100],
        ],
        [0.05, 0.1, 0.15],
        0.005,
        0.03,
        9
      )
    }
  }

  gray.delete()
  return result
}
