# CLAUDE.md

## プロジェクト概要

「小エビの間違いサラダ」(Machigai Salad) - 間違い探しをブラウザで応援するWebアプリ

### 設計思想

- **完全クライアントサイド**: すべてブラウザ内で完結
- **プライバシー重視**: 画像は外部送信しない
- **コストゼロ**: 外部APIや従量課金サービス不使用
- **静的ホスティング**: Cloudflare Pages
- **PWA対応**: ホーム画面にインストール可能、Service Workerでオフラインキャッシュ

## クイックスタート

```bash
npm install
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # Lint実行
```

## プロジェクト構成

```
app/           # Next.js App Router（ページ）
components/    # Reactコンポーネント
  icons.tsx    # 共有アイコン（UndoIcon, SaveIcon, ShareResultIcon）
hooks/         # カスタムフック（useOpenCV）
lib/
  opencv/      # OpenCV画像処理（紙検出、透視変換）
  image-utils.ts # 画像ユーティリティ（リサイズ、GIF/PNG生成）
  i18n.tsx     # 日英i18n
  storage.ts   # LocalStorage保存・復元
types/         # TypeScript型定義（Point, CornerOffsets, MAX_UNDO, gif.js, upng-js）
public/        # 静的アセット（PWAアイコン、OGP画像、QRコード、gif.worker.js等）
docs/          # 詳細ドキュメント
```

## 主要コンポーネント

| ファイル                     | 役割                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- |
| `ImageProcessor.tsx`         | 画像処理フロー制御                                                         |
| `ImageUpload.tsx`            | 画像アップロードUI                                                         |
| `PaperCornersAdjustment.tsx` | 角の調整UI（ルーペ拡大鏡付き、DPR対応）                                    |
| `ImageComparison.tsx`        | 左右画像比較UI（canvas両面描画・ドラッグ微調整・コーナーワープ・アンドゥ） |
| `ShareButtons.tsx`           | フッターSNSシェアボタン（X/LINE/Web Share）                                |
| `icons.tsx`                  | 共有SVGアイコン（Undo, Save, ShareResult）                                 |

## 画像処理フロー

1. 紙の自動検出（Cannyエッジ検出）
2. 角の手動調整（ルーペ拡大鏡で精密操作、小画像は自動拡大）
3. 台形補正（透視変換）
4. 左右分割（色は加工しない）
5. 比較表示（canvasで左右両画像描画、長押しで左右切替、スライドで位置微調整、四隅ワープ、アンドゥ、GIF独立レンダリングシェア）

## 開発ガイドライン

### コーディング規約

- TypeScript strict mode使用
- 関数コンポーネントのみ
- クライアントコンポーネントは `'use client'` 明示
- 漢数字禁止（「一回」ではなく「1回」）
- 特定店舗名の使用禁止（汎用的な間違い探しツールとして表現する）

### スペーシングルール

- **セクション間**（ヘッダ→コンテンツ、コンテンツ→フッタ）: `mb-6`（24px）
- **コンテンツ内の要素間**: `space-y-4`（16px）
- **密接な要素間**（ラベルと画像、指示とボタン）: `space-y-3`（12px）
- **コンポーネント内パディング**: `px-4 py-2.5` または `px-5 py-3`

### OpenCV.jsメモリ管理

```typescript
const mat = cv.imread(canvas)
// ... 処理
mat.delete() // 必ず解放
```

## ドキュメント

詳細は `docs/` を参照:

- `docs/architecture.md` - アーキテクチャ詳細
- `docs/design.md` - 設計ドキュメント
- `docs/todo.md` - 開発TODO
- `docs/changelog.md` - 変更履歴

## デプロイ

Cloudflare Pages の GitHub 連携で自動デプロイ:

- トリガー: `main` ブランチへの push
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `out`
- カスタムドメイン: `machigai-salad.llll-ll.com`

## トラブルシューティング

### OpenCV.jsがロードされない

- コンソールでエラー確認
- CDN接続を確認

### カメラにアクセスできない

- HTTPS必須
- ブラウザ権限を確認

### ビルド失敗

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## ライセンス

MIT License
