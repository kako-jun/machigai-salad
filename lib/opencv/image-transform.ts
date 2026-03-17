import type { Point, OpenCV, Mat } from '@/types'
import { cornersToMat } from './paper-detection'

/**
 * 2点間の距離を計算
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/**
 * 透視変換を適用して画像を正面視に変換する
 * @param src 元画像
 * @param corners 4つの角（左上、右上、右下、左下の順）
 * @param cv OpenCVインスタンス
 * @returns 変換後の画像
 */
export function applyPerspectiveTransform(src: Mat, corners: Point[], cv: OpenCV): Mat {
  // 変換後の幅と高さを計算
  const widthA = distance(corners[2], corners[3]) // 下辺
  const widthB = distance(corners[1], corners[0]) // 上辺
  const maxWidth = Math.max(widthA, widthB)

  const heightA = distance(corners[1], corners[2]) // 右辺
  const heightB = distance(corners[0], corners[3]) // 左辺
  const maxHeight = Math.max(heightA, heightB)

  // 変換元の座標
  const srcPoints = cornersToMat(corners, cv)

  // 変換先の座標（長方形）
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    maxWidth - 1,
    0,
    maxWidth - 1,
    maxHeight - 1,
    0,
    maxHeight - 1,
  ])

  // 透視変換行列を取得
  const M = cv.getPerspectiveTransform(srcPoints, dstPoints)

  // 透視変換を適用
  const warped = new cv.Mat()
  cv.warpPerspective(src, warped, M, new cv.Size(maxWidth, maxHeight))

  // クリーンアップ
  srcPoints.delete()
  dstPoints.delete()
  M.delete()

  return warped
}

/**
 * 色調補正（ヒストグラム均等化）を適用
 * @param src 元画像
 * @param cv OpenCVインスタンス
 * @returns 補正後の画像
 */
export function applyColorCorrection(src: Mat, cv: OpenCV): Mat {
  const corrected = new cv.Mat()

  if (src.channels() === 1) {
    // グレースケール画像
    cv.equalizeHist(src, corrected)
  } else {
    // カラー画像：RGBに変換してから各チャンネルを個別に均等化
    const rgb = new cv.Mat()
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

    // split で3チャンネルに分離
    const splitVec = new cv.MatVector()
    cv.split(rgb, splitVec)
    rgb.delete()

    // 各チャンネルを equalizeHist（src と dst は別オブジェクトが必須）
    const eq0 = new cv.Mat()
    const eq1 = new cv.Mat()
    const eq2 = new cv.Mat()
    const ch0 = splitVec.get(0)
    const ch1 = splitVec.get(1)
    const ch2 = splitVec.get(2)
    cv.equalizeHist(ch0, eq0)
    cv.equalizeHist(ch1, eq1)
    cv.equalizeHist(ch2, eq2)
    ch0.delete()
    ch1.delete()
    ch2.delete()
    splitVec.delete()

    // 均等化済みチャンネルを MatVector に詰めて merge
    const mergeVec = new cv.MatVector()
    mergeVec.push_back(eq0)
    mergeVec.push_back(eq1)
    mergeVec.push_back(eq2)
    cv.merge(mergeVec, corrected)
    mergeVec.delete()
    eq0.delete()
    eq1.delete()
    eq2.delete()
  }

  return corrected
}

/**
 * 画像を左右に分割
 * @param src 元画像
 * @param cv OpenCVインスタンス
 * @returns 左右の画像の配列
 */
export function splitImage(src: Mat, cv: OpenCV): [Mat, Mat] {
  const midX = Math.floor(src.cols / 2)
  const leftRect = new cv.Rect(0, 0, midX, src.rows)
  const rightRect = new cv.Rect(midX, 0, src.cols - midX, src.rows)

  const leftMat = src.roi(leftRect)
  const rightMat = src.roi(rightRect)

  return [leftMat, rightMat]
}
