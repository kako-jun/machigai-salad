// 座標を表す型
export interface Point {
  x: number
  y: number
}

// 画像サイズを表す型
export interface ImageSize {
  width: number
  height: number
}

// OpenCV.jsのグローバル型定義
declare global {
  interface Window {
    cv: OpenCV
  }
}

// OpenCV.jsの型定義（使用する機能のみ）
export interface OpenCV {
  onRuntimeInitialized: () => void

  // Mat関連
  Mat: new () => Mat
  MatVector: new () => MatVector
  imread: (canvas: HTMLCanvasElement) => Mat
  imshow: (canvas: HTMLCanvasElement, mat: Mat) => void
  matFromArray: (rows: number, cols: number, type: number, data: number[]) => Mat

  // 画像処理
  cvtColor: (src: Mat, dst: Mat, code: number) => void
  GaussianBlur: (src: Mat, dst: Mat, ksize: Size, sigmaX: number) => void
  Canny: (src: Mat, dst: Mat, threshold1: number, threshold2: number) => void
  equalizeHist: (src: Mat, dst: Mat) => void
  split: (src: Mat, channels: MatVector) => void
  merge: (channels: MatVector, dst: Mat) => void

  // 輪郭
  findContours: (
    image: Mat,
    contours: MatVector,
    hierarchy: Mat,
    mode: number,
    method: number
  ) => void
  contourArea: (contour: Mat) => number
  arcLength: (curve: Mat, closed: boolean) => number
  approxPolyDP: (curve: Mat, approxCurve: Mat, epsilon: number, closed: boolean) => void

  // 透視変換
  getPerspectiveTransform: (src: Mat, dst: Mat) => Mat
  warpPerspective: (src: Mat, dst: Mat, M: Mat, dsize: Size) => void

  // ユーティリティ
  Size: new (width: number, height: number) => Size
  Rect: new (x: number, y: number, width: number, height: number) => Rect

  // 定数
  COLOR_RGBA2GRAY: number
  COLOR_RGBA2RGB: number
  RETR_EXTERNAL: number
  CHAIN_APPROX_SIMPLE: number
  CV_32FC2: number
}

export interface Mat {
  rows: number
  cols: number
  data32S: Int32Array
  channels: () => number
  roi: (rect: Rect) => Mat
  clone: () => Mat
  delete: () => void
}

export interface MatVector {
  size: () => number
  get: (index: number) => Mat
  delete: () => void
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
