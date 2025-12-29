# CLAUDE.md

## プロジェクト概要

「小エビの間違いサラダ」- サイゼリヤの間違い探しをブラウザで支援するWebアプリ

### 設計思想

- **完全クライアントサイド**: すべてブラウザ内で完結
- **プライバシー重視**: 画像は外部送信しない
- **コストゼロ**: 外部APIや従量課金サービス不使用
- **静的ホスティング**: GitHub Pages / Cloudflare Pages

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
hooks/         # カスタムフック（useOpenCV）
lib/opencv/    # 画像処理ユーティリティ
types/         # TypeScript型定義
docs/          # 詳細ドキュメント
```

## 主要コンポーネント

| ファイル                     | 役割               |
| ---------------------------- | ------------------ |
| `ImageProcessor.tsx`         | 画像処理フロー制御 |
| `ImageUpload.tsx`            | 画像アップロードUI |
| `PaperCornersAdjustment.tsx` | 角の調整UI         |
| `ImageComparison.tsx`        | 左右画像比較UI     |

## 画像処理フロー

1. 紙の自動検出（Cannyエッジ検出）
2. 角の手動調整（オプション）
3. 台形補正（透視変換）
4. 色調補正（ヒストグラム均等化）
5. 左右分割
6. タップで比較表示

## 開発ガイドライン

### コーディング規約

- TypeScript strict mode使用
- 関数コンポーネントのみ
- クライアントコンポーネントは `'use client'` 明示

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

GitHub Actionsで自動デプロイ:

- トリガー: `main`/`claude/*` ブランチへのpush
- 環境変数: `GITHUB_PAGES=true`

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
