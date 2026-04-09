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
│   ├── PaperCornersAdjustment.tsx  # 角の調整 UI
│   ├── SavesPopup.tsx         # 保存データ一覧ポップアップ
│   ├── LangToggle.tsx         # JA/EN言語切替トグル
│   ├── ShareButtons.tsx        # フッターSNSシェアボタン（X/LINE/Web Share/クリップボード）
│   ├── icons.tsx              # 共有アイコン（UndoIcon, SaveIcon, ShareResultIcon）
│   ├── PwaInstallPrompt.tsx   # PWAインストールバナー（beforeinstallprompt）
│   └── VisitorCounter.tsx     # Nostalgicカウンター+ビルド日バージョン表示
├── hooks/                      # カスタムフック
│   ├── index.ts               # エクスポート
│   └── useOpenCV.ts           # OpenCV.js管理フック
├── lib/                        # ユーティリティライブラリ
│   ├── i18n.tsx               # 日英i18n（React Context + 辞書）
│   ├── image-utils.ts         # 画像ユーティリティ（リサイズ、GIF/APNG生成）
│   ├── mesh-warp.ts           # 5点メッシュワープ（4三角形アフィン変換）
│   ├── storage.ts             # LocalStorage保存・復元
│   └── opencv/                # OpenCV関連
│       ├── index.ts           # エクスポート
│       ├── paper-detection.ts # 紙の検出ロジック
│       └── image-transform.ts # 画像変換ロジック
├── types/                      # 型定義
│   ├── index.ts               # 共通型定義（Point, CornerOffsets, MAX_UNDO, OpenCV）
│   ├── gif.js.d.ts            # gif.js型定義（GIFエンコード）
│   └── upng-js.d.ts           # upng-js型定義（APNGエンコード）
├── docs/                       # ドキュメント
│   ├── architecture.md        # アーキテクチャ（このファイル）
│   ├── design.md              # 設計ドキュメント
│   ├── todo.md                # 開発TODO
│   ├── changelog.md           # 変更履歴
│   └── ...                    # その他（features, platforms, roadmap等）
├── public/                     # 静的アセット
│   ├── manifest.webmanifest   # PWAマニフェスト
│   ├── sw.js                  # Service Worker
│   ├── favicon.webp           # ブラウザタブアイコン
│   ├── apple-touch-icon.webp  # iOS用アイコン
│   └── static/                # PWAアイコン、OGP画像、QRコード、バナー
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

左右の画像を切り替え表示。canvas描画で5点メッシュワープ（4隅+中心）を適用。

- DOM `<img>` 要素は不使用。左右両画像をcanvasで描画
- パネルはCSS `aspect-ratio` で画像アスペクト比に追従
- `imgRect` は `panel.clientWidth/clientHeight` から純粋な数学で計算（DOM img測定に依存しない）
- 長押し: 左画像を非表示（右画像が見える）
- スライド: 左画像の位置微調整
- 四隅・中心ハンドル: メッシュワープ調整（ハンドルはDOMで残す。画像外にはみ出してドラッグできるため）
- GIF生成: ImageProcessorから `leftDataUrl + rightDataUrl + displaySize + warpパラメータ` を受け取り、image-utils.ts が画像データから独立レンダリング（表示canvasに依存しない）

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

### 3. 左右分割

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

1. **画像の自動縮小**: カメラ取得後に表示解像度×dpr（上限2400px）にcanvasリサイズ
2. **OpenCV.jsの遅延ロード**: CDNから動的ロード
3. **画像処理の非同期化**: Promiseでラップ
4. **メモリ管理**: Matオブジェクトは必ず`.delete()`

```typescript
// Good
src.delete()
corrected.delete()
```

## PWA

### マニフェスト (`public/manifest.webmanifest`)

- `display: standalone` でネイティブアプリ風の全画面表示
- `orientation: portrait` で縦向き固定
- テーマカラー・背景色は `#FEF6DC`（アイコン背景色と統一、PWAスプラッシュが自然に繋がる）
- アイコン: 192x192 / 512x512（webp、maskable対応）

### Service Worker (`public/sw.js`)

- network-first戦略: 常にネットワークを優先し、オフライン時のみキャッシュにフォールバック
- デプロイ後にユーザーが即座に最新版を取得可能
- 旧バージョンのキャッシュを自動削除
- `skipWaiting` + `clients.claim` で即座に有効化

### OGP

- `layout.tsx` で Open Graph / Twitter Card メタタグを設定
- OGP画像: `public/static/ogp.webp`（1200x630）

## データ永続化

### LocalStorage (`lib/storage.ts`)

- キー: `machigai-salad`（アプリ全体で1つのルートキー）
- 値: `{ saves: SaveEntry[], lang?: "ja"|"en" }` のJSONオブジェクト
- 各SaveEntry: `{ id, savedAt, originalImage, corners, offset, imageSize, warpCorners, centerOffset, twoImageMode?, rightImageData? }`
- 加工済み画像は保存しない（復元時にcornersから再処理）
- `crypto.randomUUID()` でID生成
- 同じ画像セッション内の連続保存は上書き（`updateSave`）。新画像読込時にID解放→次回は新規作成

## 国際化 (i18n)

### lib/i18n.tsx

- React Context + 辞書ベースの軽量i18n（外部ライブラリ不要）
- 対応言語: 日本語 (ja) / 英語 (en)
- 初期値: `localStorage`（ルートキー `machigai-salad` の `lang` フィールド） → `navigator.language` の順で判定
- 言語選択は `lib/storage.ts` の `saveLang()` で永続化（ルートキーに統合済み）
- `html lang` 属性も動的に切替
- `as const` + `keyof typeof dict` で辞書キーの型安全を確保
- metadata (OGP, title) はサーバーサイド固定（日本語のみ）

## デプロイ

### Cloudflare Pages

- GitHub連携で`main`ブランチへのpushで自動デプロイ
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `out`
- カスタムドメイン: `machigai-salad.llll-ll.com`
