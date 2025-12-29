# アーキテクチャドキュメント

## 技術スタック

```
Next.js 15 (静的エクスポート)
├── React 19 - UIフレームワーク
├── TypeScript - 型安全性
├── Tailwind CSS - スタイリング
└── OpenCV.js - 画像処理ライブラリ
```

## ディレクトリ構成

```
machigai-salad/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # ルートレイアウト
│   ├── page.tsx               # トップページ
│   └── globals.css            # グローバルスタイル
├── components/                 # Reactコンポーネント
│   ├── ImageProcessor.tsx     # 画像処理の統合コンポーネント
│   ├── ImageUpload.tsx        # 画像アップロード UI
│   ├── ImageComparison.tsx    # 画像比較 UI
│   └── PaperCornersAdjustment.tsx  # 角の調整 UI
├── hooks/                      # カスタムフック
│   ├── index.ts               # エクスポート
│   └── useOpenCV.ts           # OpenCV.js管理フック
├── lib/                        # ユーティリティライブラリ
│   └── opencv/                # OpenCV関連
│       ├── index.ts           # エクスポート
│       ├── paper-detection.ts # 紙の検出ロジック
│       └── image-transform.ts # 画像変換ロジック
├── types/                      # 型定義
│   └── index.ts               # 共通型定義
├── docs/                       # ドキュメント
│   ├── architecture.md        # アーキテクチャ（このファイル）
│   ├── design.md              # 設計ドキュメント
│   ├── todo.md                # 開発TODO
│   └── changelog.md           # 変更履歴
├── public/                     # 静的アセット
├── .github/workflows/          # GitHub Actions
├── CLAUDE.md                   # 開発者向けガイド
├── next.config.ts             # Next.js設定
├── tailwind.config.ts         # Tailwind設定
└── tsconfig.json              # TypeScript設定
```

## コンポーネント設計

### ImageProcessor

画像処理の統合コンポーネント。`useOpenCV`フックを使用。

**状態:**

```typescript
originalImage: string | null     // 元画像
leftImage: string | null         // 分割後の左画像
rightImage: string | null        // 分割後の右画像
isProcessing: boolean            // 処理中フラグ
detectedCorners: Point[] | null  // 検出した4つの角
showCornersAdjustment: boolean   // 角調整UI表示フラグ
```

### ImageUpload

画像のアップロード/撮影を担当。

- `capture="environment"` でカメラアクセス
- OpenCV.jsロード中はボタン無効化

### PaperCornersAdjustment

自動検出した紙の4つの角を微調整。

- Canvas上で画像と角を描画
- マウス/タッチでドラッグ
- ドラッグ中の角にグロー効果

### ImageComparison

左右の画像を切り替え表示。

- タッチ/マウスダウン: 右の画像
- タッチ/マウスアップ: 左の画像

## 画像処理パイプライン

### 1. 紙の自動検出 (`lib/opencv/paper-detection.ts`)

```typescript
// 複数のCannyしきい値で試行
const CANNY_THRESHOLD_PAIRS = [
  [30, 100],
  [50, 150],
  [75, 200],
]

// 複数のepsilonで四角形近似
const APPROX_EPSILON_VALUES = [0.02, 0.03, 0.04]
```

**処理フロー:**

1. グレースケール変換
2. ガウシアンブラー
3. Cannyエッジ検出
4. 輪郭抽出
5. 4角形検出

**検出条件:**

- 面積が画像の5%以上
- 4つの角を持つ多角形
- 最も大きい四角形を採用

### 2. 台形補正 (`lib/opencv/image-transform.ts`)

```typescript
const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
cv.warpPerspective(src, warped, M, new cv.Size(maxWidth, maxHeight))
```

### 3. 色調補正

ヒストグラム均等化により照明条件の違いを補正。

### 4. 左右分割

画像を中央で分割。

## フック設計

### useOpenCV

OpenCV.jsをロードして画像処理機能を提供。

```typescript
interface UseOpenCVReturn {
  cvLoaded: boolean
  detectCorners: (imageDataUrl: string) => Promise<Point[] | null>
  processImage: (imageDataUrl: string, corners: Point[] | null) => Promise<ProcessedImages>
}
```

## 型定義 (`types/index.ts`)

```typescript
export interface Point {
  x: number
  y: number
}

export interface OpenCV {
  // OpenCV.jsのメソッド定義
}

export interface Mat {
  // OpenCV Matオブジェクト
}
```

## パフォーマンス最適化

1. **OpenCV.jsの遅延ロード**: CDNから動的ロード
2. **画像処理の非同期化**: Promiseでラップ
3. **メモリ管理**: Matオブジェクトは必ず`.delete()`

```typescript
// Good
src.delete()
corrected.delete()
```

## デプロイ

### GitHub Pages

- `main`ブランチへのpushで自動デプロイ
- ビルド環境変数: `GITHUB_PAGES=true`
