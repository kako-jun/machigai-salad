# CLAUDE.md - 開発者向けドキュメント

## プロジェクト概要

「小エビの間違いサラダ」は、サイゼリヤの間違い探しをブラウザ上で支援するWebアプリケーションです。

### 設計思想

1. **完全クライアントサイド**: サーバーサイド処理を一切行わず、すべてブラウザ内で完結
2. **プライバシー重視**: 画像は外部にアップロードされず、ローカルストレージにも保存しない
3. **コストゼロ**: 外部APIや従量課金サービスを使用しない
4. **静的ホスティング**: GitHub Pages / Cloudflare Pagesで動作する静的サイト

## アーキテクチャ

### 技術スタック

```
Next.js 15 (静的エクスポート)
├── React 19 - UIフレームワーク
├── TypeScript - 型安全性
├── Tailwind CSS - スタイリング
└── OpenCV.js - 画像処理ライブラリ
```

### ディレクトリ構成

```
machigai-salad/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # トップページ
│   └── globals.css        # グローバルスタイル
├── components/             # Reactコンポーネント
│   ├── ImageProcessor.tsx # 画像処理の統合コンポーネント
│   ├── ImageUpload.tsx    # 画像アップロード UI
│   └── ImageComparison.tsx # 画像比較 UI
├── public/                 # 静的アセット
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions デプロイ設定
├── next.config.ts         # Next.js設定
├── tailwind.config.ts     # Tailwind設定
└── tsconfig.json          # TypeScript設定
```

## コンポーネント設計

### ImageProcessor (components/ImageProcessor.tsx)

画像処理の中心となるコンポーネント。

**責務:**

- OpenCV.jsのロードと初期化
- 画像の処理フロー制御
- 状態管理（画像データ、処理中フラグ）

**主な処理:**

1. OpenCV.jsを動的にロード（CDNから）
2. アップロードされた画像を受け取る
3. 画像処理を実行（色調補正、分割）
4. 処理済み画像を子コンポーネントに渡す

**状態:**

```typescript
const [originalImage, setOriginalImage] = useState<string | null>(null)
const [leftImage, setLeftImage] = useState<string | null>(null)
const [rightImage, setRightImage] = useState<string | null>(null)
const [isProcessing, setIsProcessing] = useState(false)
const [cvLoaded, setCvLoaded] = useState(false)
```

### ImageUpload (components/ImageUpload.tsx)

画像のアップロード/撮影を担当するコンポーネント。

**特徴:**

- `<input type="file" capture="environment">` でカメラアクセス
- iOS Safari / Android Chrome / PC全対応
- OpenCV.jsがロードされるまでボタンを無効化

### ImageComparison (components/ImageComparison.tsx)

分割された左右の画像を比較表示するコンポーネント。

**UI動作:**

- マウスダウン/タッチスタート: 右の画像を表示
- マウスアップ/タッチエンド: 左の画像を表示
- シームレスな切り替えアニメーション

## 画像処理フロー

### 1. 画像の読み込み

```typescript
const img = new Image()
img.onload = () => {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  let src = cv.imread(canvas)
  // ...
}
img.src = imageDataUrl
```

### 2. 色調補正

ヒストグラム均等化により、照明条件の違いを補正。

```typescript
// RGB画像の場合、各チャンネルに対して均等化
cv.cvtColor(src, corrected, cv.COLOR_RGBA2RGB)
let channels = new cv.MatVector()
cv.split(corrected, channels)
for (let i = 0; i < 3; i++) {
  cv.equalizeHist(channels.get(i), channels.get(i))
}
cv.merge(channels, corrected)
```

### 3. 左右分割

画像を中央で分割。

```typescript
const midX = Math.floor(corrected.cols / 2)
const leftRect = new cv.Rect(0, 0, midX, corrected.rows)
const rightRect = new cv.Rect(midX, 0, corrected.cols - midX, corrected.rows)

const leftMat = corrected.roi(leftRect)
const rightMat = corrected.roi(rightRect)
```

### 4. Canvas出力

```typescript
const leftCanvas = document.createElement('canvas')
cv.imshow(leftCanvas, leftMat)
setLeftImage(leftCanvas.toDataURL())
```

## 将来の拡張機能（未実装）

### 台形補正（透視変換）

間違い探しを斜めから撮影した場合の補正。

**実装方法案:**

1. エッジ検出で画像の輪郭を抽出
2. 輪郭から4つの角を特定
3. `cv.getPerspectiveTransform()` で変換行列を計算
4. `cv.warpPerspective()` で画像を変換

```typescript
// 疑似コード
const corners = detectCorners(src) // 角の検出
const dstCorners = calculateIdealCorners(src.size()) // 理想的な長方形
const transform = cv.getPerspectiveTransform(corners, dstCorners)
cv.warpPerspective(src, dst, transform, src.size())
```

### 自動差分検出

左右の画像の差分を自動的に検出してハイライト。

**実装方法案:**

```typescript
const diff = new cv.Mat()
cv.absdiff(leftMat, rightMat, diff)
cv.threshold(diff, diff, 30, 255, cv.THRESH_BINARY)
// 差分領域を矩形で囲む
```

### PWA化

オフラインでも動作するようにService Workerを追加。

## デプロイ

### GitHub Pages（テスト環境）

**設定手順:**

1. リポジトリの Settings → Pages
2. Source: "GitHub Actions" を選択
3. ブランチに push すると自動デプロイ

**トリガー:**

- `main` ブランチへのpush
- `claude/*` ブランチへのpush
- 手動実行 (workflow_dispatch)

**ビルド環境変数:**

- `GITHUB_PAGES=true` - GitHub Pages用のbasePath設定を有効化

### Cloudflare Pages（本番環境・将来）

**設定予定:**

```javascript
// next.config.ts に追加予定
const nextConfig: NextConfig = {
  output: 'export',
  // Cloudflare Pages用の設定
}
```

## 開発ガイドライン

### コーディング規約

1. **TypeScript strict mode**: 型安全性を最大限に活用
2. **関数コンポーネント**: クラスコンポーネントは使用しない
3. **hooks**: useState, useEffect, useRef を適切に使用
4. **クライアントコンポーネント**: `'use client'` を明示的に指定

### パフォーマンス最適化

1. **OpenCV.jsの遅延ロード**: 初回レンダリング時にCDNから動的ロード
2. **画像処理の非同期化**: Promiseでラップして UI をブロックしない
3. **メモリ管理**: OpenCV.jsのMatオブジェクトは使用後に必ず `.delete()` を呼ぶ

```typescript
// Good
src.delete()
corrected.delete()
leftMat.delete()
rightMat.delete()
```

### エラーハンドリング

1. OpenCV.jsのロード失敗
2. 画像の読み込みエラー
3. 画像処理中のエラー

すべてのエラーは `try-catch` でキャッチし、ユーザーに適切なメッセージを表示。

## トラブルシューティング

### OpenCV.jsがロードされない

**原因:**

- CDNへの接続失敗
- ブラウザの互換性

**解決策:**

- コンソールでエラーを確認
- 別のCDN URLを試す
- ローカルにOpenCV.jsをホストする

### カメラにアクセスできない

**原因:**

- HTTPSではない（HTTP では動作しない）
- ブラウザの権限が拒否されている

**解決策:**

- HTTPS でホスティング
- ブラウザの設定を確認

### ビルドが失敗する

**原因:**

- 依存関係の不一致
- TypeScriptのエラー

**解決策:**

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## テスト

### 手動テスト項目

- [ ] 画像アップロードが動作する
- [ ] カメラ撮影が動作する（スマホ）
- [ ] OpenCV.jsが正しくロードされる
- [ ] 画像が左右に分割される
- [ ] 色調補正が適用される
- [ ] タップで画像が切り替わる
- [ ] ビルドが成功する
- [ ] GitHub Pagesにデプロイされる

## リファレンス

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenCV.js Documentation](https://docs.opencv.org/4.9.0/d5/d10/tutorial_js_root.html)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev/)

## ライセンス

MIT License

## メンテナンス

### 依存関係の更新

```bash
npm outdated
npm update
```

### セキュリティチェック

```bash
npm audit
npm audit fix
```
