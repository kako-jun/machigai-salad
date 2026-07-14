# 設計ドキュメント

## プロジェクト概要

「小エビの間違いサラダ」は、紙の間違い探しをスマートフォンやブラウザで楽しく遊べるようにするWebアプリケーションです。

### ターゲットユーザー

- **子供**: 小学生でも使える平易な言葉とカラフルなUI
- **家族**: 外食を楽しむ家族連れ
- **カジュアルユーザー**: 専門知識不要で直感的に使える

### コアバリュー

1. **完全無料**: サーバーコスト0円
2. **プライバシー保護**: 画像は端末内で処理、外部送信なし
3. **使いやすさ**: 子供でも迷わず使える
4. **楽しさ**: 絵文字とカラフルなデザイン

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────┐
│   ユーザーのブラウザ                  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  React 19 + Next.js 15       │  │
│  │  (静的サイト)                 │  │
│  └──────────────────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  OpenCV.js                   │  │
│  │  (同一オリジンから配信)       │  │
│  └──────────────────────────────┘  │
│              ↓                      │
│  ┌──────────────────────────────┐  │
│  │  カメラ / ファイル入力        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### PWA更新方針（mypace方式）

手書き Service Worker（`public/sw.js`）と `components/ServiceWorkerRegister.tsx` が連携し、
新バージョン検知後に自動で安全に切り替える。検知・busyゲートのロジック本体は
`lib/swUpdateDetection.ts`（DOM非依存の純粋関数、vitest node環境でテスト可能）に切り出し、
`ServiceWorkerRegister.tsx` はそれを配線するだけの薄いレイヤーにしている。

- `sw.js` の `install` では `self.skipWaiting()` を**呼ばない**。既存タブが古い SW に
  制御されている「更新」ケースでは新 SW は `waiting` のまま待機する（初回インストール時は
  制御元がないため従来どおり即activateされる）
- 更新検知は2経路。両方とも `lib/swUpdateDetection.ts` の関数を使う
  - **mount時にすでに`waiting`/`installing`のSWがある場合**: `detectExistingUpdate()` が
    `registration.waiting`/`registration.installing` を直接チェックする。ブラウザは
    ナビゲーション時に自前でSW更新チェックを行うため、React hydration→useEffect実行より
    前に更新が完了しているケースは通常のデプロイ後リロードで普通に起こる
    （`updatefound` は新規installing開始時にのみ発火し、すでにそれを過ぎたworkerには
    再発火しないため、`updatefound` 待ちだけでは検知漏れになる）
  - **mount後に新たな更新が来た場合**: `updatefound` → 新 worker の `statechange` で
    `installed` かつ `navigator.serviceWorker.controller` あり（=更新）を
    `watchInstallingWorker()` が検知
- 検知後、`lib/appBusy.ts` の `waitUntilIdle()` でユーザーが作業中でないか確認してから
  overlay を表示（`pwaUpdateRestarting` の ja/en 文言）。作業中（`ImageProcessor` の
  `phase !== 'upload'`：角調整・比較・GIF/動画生成・保存）の間は reload しない
- overlay 表示〜実際の reload の間も、`makeIdleGatedOnce()` で busy を3箇所
  （postMessage送信直前・`controllerchange` ハンドラ内・fallbackタイマー内）再チェックする。
  overlay はポインタ操作こそ塞ぐが、フォーカス済み要素へのキー入力や既に走っている非同期処理
  までは止めないため、overlay表示後に作業が再開されるケースがある
- overlay 表示後、`registration.waiting.postMessage({ type: 'SKIP_WAITING' })` で
  SW に `self.skipWaiting()` を実行させ、`controllerchange` を待って `location.reload()`
  （`controllerchange` が来ない場合は2秒でフォールバック reload）
- `sessionStorage` に更新時刻を記録し、10秒以内の再更新はスキップ（reload ループ防止）
- SW登録・リスナー設定用の `useEffect` は依存配列 `[]` で**必ず一度だけ**実行する。
  overlay文言に使う `t`（`useI18n()`）は `useRef` 経由（`tRef.current(...)`）で参照し、
  effectの依存には含めない。`t` は `lang` が変わるたびに参照が変わる
  （`/` route の言語auto-detectで `'ja'→'en'` に切り替わる等）ため、これをeffectの依存に
  入れると登録処理が再実行され、cleanupが `updatefound` リスナーを外さないことと相まって
  同一registrationに複数リスナーが残り、実更新時にモジュールレベル `applying` フラグの
  奪い合いで更新がサイレントに握りつぶされる（#51で発生した実際のリグレッション）

参考実装: mypace (`apps/web/src/main.tsx` の `registerSW`) と同じ overlay → skipWaiting →
controllerchange → reload → cooldown の流れを、vite-plugin-pwa を使わない素の
`navigator.serviceWorker` API で再現している。

### ルーティングと多言語 (i18n)

言語ごとに **別URL** を持ち、各ページが自分の `<html lang>` を静的に出力する。
これは Next.js の **route group で root layout を2つ**に分ける構成で実現している。

```
app/
├── (ja)/                 # URL `/`   — <html lang="ja">
│   ├── layout.tsx        #   JA メタ / JSON-LD（inLanguage [ja,en]）
│   └── page.tsx          #   → <HomePage />
├── (en)/                 # URL `/en` — <html lang="en">
│   ├── layout.tsx        #   EN メタ / JSON-LD、I18nProvider forcedLang="en"
│   └── en/page.tsx       #   → <HomePage />
├── globals.css
├── robots.ts             # 静的 robots.txt
└── sitemap.ts            # 静的 sitemap.xml
```

- `components/HomePage.tsx` が本体（両ルートで共有描画）
- `lib/seo.ts` に言語別 metadata / JSON-LD を集約。`alternates.languages` で
  **hreflang（ja=`/` / en=`/en` / x-default=`/`）** と canonical を両ページに出力
- `lib/i18n.tsx` の `I18nProvider` は `forcedLang` を受け取る。`/en` は en 固定
  （navigator / localStorage より URL を優先＝ちらつき防止）。`/` は従来どおり
  ブラウザ言語で自動判定
- `LangToggle` は 2ルート間のナビゲーション（JA→`/`、EN→`/en`）。選択を
  localStorage に保存し、`/` の自動判定が選択を尊重する

### 画像処理パイプライン

```
カメラ撮影
    ↓
1. 紙の自動検出 (detectPaperContour)
   - グレースケール変換
   - ガウシアンブラー
   - Cannyエッジ検出（複数しきい値で試行）
   - 輪郭抽出
   - 4角形検出
    ↓
2. 角の調整UI (PaperCornersAdjustment)
   - 検出した4つの角を表示
   - ドラッグで微調整可能
   - タッチ/マウス操作対応
    ↓
3. 台形補正 (applyPerspectiveTransform)
   - 透視変換行列の計算
   - warpPerspectiveで画像変換
    ↓
4. 左右分割（色は加工しない）
   - 中央で分割
   - 2つの画像を生成
    ↓
5. 比較表示 (ImageComparison)
   - タップで切り替え
   - スムーズなアニメーション
```

## コンポーネント設計

### 1. ImageProcessor (統合コンポーネント)

**役割**: アプリ全体の状態管理と画像処理フロー制御

**状態**:

```typescript
// 画像データ
originalImage: string | null          // 元画像
leftImage: string | null              // 分割後の左画像
rightImage: string | null             // 分割後の右画像

// UI状態
isProcessing: boolean                 // 処理中フラグ
cvLoaded: boolean                     // OpenCV.js読み込み完了
detectedCorners: Point[] | null       // 検出した4つの角
showCornersAdjustment: boolean        // 角調整UI表示フラグ
```

**主要メソッド**:

- `handleImageUpload()`: 画像アップロード処理
- `detectPaperCorners()`: 紙の4角を自動検出
- `handleCornersApply()`: 調整後の角で台形補正を実行
- `handleCornersCancel()`: 角調整をスキップ
- `processImageWithCorners()`: 台形補正〜分割までの処理

### 2. ImageUpload (画像入力UI)

**役割**: カメラ撮影またはファイル選択

**特徴**:

- `capture="environment"`: 背面カメラを優先
- 子供向けの大きなボタンとわかりやすい説明
- OpenCV.jsロード中はボタンを無効化

**デザイン**:

- 🍤 小エビのアイコン
- オレンジ〜イエローのグラデーション背景
- 4ステップの使い方ガイド

### 3. PaperCornersAdjustment (角調整UI)

**役割**: 自動検出した紙の角を微調整

**機能**:

- Canvasに画像と4つの角を描画
- ドラッグで角の位置を変更
- リアルタイムで描画を更新

**視覚デザイン**:

- オレンジ色の丸で角を表示
- ドラッグ中は光る（グロー効果）
- 方向矢印の絵文字（↖️↗️↘️↙️）
- 太い線で四角形を描画

**操作**:

- マウス/タッチ両対応
- 画像サイズに応じて自動スケール
- 画像境界外に出ないようクランプ

### 4. ImageComparison (画像比較UI)

**役割**: 左右の画像を切り替えて表示

**動作**:

- デフォルト: 左の画像を表示
- タッチダウン/マウスダウン: 右の画像を表示
- タッチアップ/マウスアップ: 左の画像に戻る
- マウスが領域外に出た場合も左に戻る

**デザイン**:

- 画像下部にインジケーター（1つ目/2つ目）
- スムーズなフェードアニメーション
- 操作ガイドを常に表示

## OpenCV.js活用

### 紙の自動検出アルゴリズム

```typescript
// 複数のCannyしきい値で試行
const thresholdPairs = [
  [30, 100], // 弱いエッジも検出
  [50, 150], // 標準
  [75, 200], // 強いエッジのみ
]

// 複数のepsilonで四角形近似
for (const epsilon of [0.02, 0.03, 0.04]) {
  cv.approxPolyDP(contour, approx, epsilon * peri, true)
  // 4つの角を持つ場合に採用
}
```

**検出条件**:

- 面積が画像の5%以上
- 4つの角を持つ多角形
- 最も大きい四角形を採用
- 20%以上の候補が見つかったら早期終了

### 台形補正 (透視変換)

```typescript
// 4つの角から変換行列を計算
const M = cv.getPerspectiveTransform(srcPoints, dstPoints)

// 画像を変換
cv.warpPerspective(src, warped, M, new cv.Size(maxWidth, maxHeight))
```

**幅・高さの計算**:

- 上辺と下辺の長さから最大幅を算出
- 左辺と右辺の長さから最大高さを算出
- 変換後は正面から見た長方形になる

### メモリ管理

OpenCV.jsのMatオブジェクトは必ず`.delete()`で解放:

```typescript
try {
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  // ... 処理 ...
} finally {
  src.delete()
  gray.delete()
  // 全てのMatを明示的に解放
}
```

## UIデザイン原則

### 子供向けデザイン

1. **平易な言葉**
   - 「紙の範囲を調整」→「📄 まっすぐに直そう！」
   - 「適用」→「これでOK！」
   - 専門用語を避ける

2. **絵文字を活用**
   - 📷 写真
   - 💡 ヒント

3. **カラフルなデザイン**
   - オレンジ〜イエローのグラデーション
   - 明るく楽しい配色
   - 高コントラストで見やすく

4. **大きなボタン**
   - タッチしやすいサイズ
   - タップ時にアニメーション（`active:scale-95`）
   - 影付きで立体感

### アクセシビリティ

- タッチとマウス両対応
- スクリーンリーダー用のalt属性
- 十分なコントラスト比
- 大きなタップターゲット（48px以上）

## パフォーマンス最適化

### 画像処理の最適化

1. **早期終了**: 良い候補が見つかったら検索を打ち切り
2. **適応的パラメータ**: 複数の設定を試行して最適なものを選択
3. **非同期処理**: Promiseでラップしてメインスレッドをブロックしない

### ロード時間の最適化

1. **OpenCV.jsの遅延ロード**: 初回アクセス時に `/opencv.js`（同一オリジン同梱）を動的ロード
2. **静的ビルド**: Next.jsで静的HTMLを事前生成
3. **画像の最適化**: 処理後の画像はDataURLで保持

## エラーハンドリング

### ユーザーフレンドリーなメッセージ

```typescript
// 悪い例
alert('Error: Image processing failed')

// 良い例
alert('😅 うまくいかなかったみたい。もう一度写真をとってみてね！')
```

### エラーケース

1. **OpenCV.jsロード失敗**
   - ボタンを無効化
   - 「じゅんび中...」と表示

2. **紙の検出失敗**
   - 調整UIをスキップ
   - 元画像のまま処理続行

3. **画像処理エラー**
   - 優しいメッセージで再試行を促す
   - 初期状態に戻る

## テスト戦略

### 手動テストチェックリスト

#### 基本機能

- [ ] カメラで撮影できる
- [ ] ファイルから画像を選択できる
- [ ] OpenCV.jsが正常にロードされる

#### 紙の検出

- [ ] 正面から撮った紙を検出できる
- [ ] 斜めから撮った紙を検出できる
- [ ] 背景が複雑でも検出できる
- [ ] 検出失敗時も処理を続行できる

#### 角の調整

- [ ] 4つの角が正しく表示される
- [ ] マウスでドラッグできる
- [ ] タッチでドラッグできる（スマホ）
- [ ] 画像境界外に出ない
- [ ] ドラッグ中の角が光る

#### 画像処理

- [ ] 台形補正が正しく動作する
- [ ] 左右に正しく分割される（色は元画像のまま）
- [ ] 左右に正しく分割される

#### 画像比較

- [ ] タップで右の画像が表示される
- [ ] 離すと左の画像に戻る
- [ ] マウス操作でも動作する
- [ ] アニメーションがスムーズ

#### デバイス対応

- [ ] iOS Safari で動作する
- [ ] Android Chrome で動作する
- [ ] PCブラウザで動作する
- [ ] 縦向き・横向き両対応

## セキュリティ

### プライバシー保護

1. **画像の外部送信なし**: すべてブラウザ内で処理
2. **ブラウザ内完結**: 保存データ（画像 Blob・角座標等）は IndexedDB、言語設定は localStorage。いずれもブラウザ内に留まり外部送信しない
3. **外部API不使用**: OpenCV.js も自サーバーから同梱配信（外部CDN非依存）

### セキュアなホスティング

1. **HTTPS必須**: カメラアクセスに必要
2. **静的サイト**: サーバーサイドの脆弱性なし
3. **依存関係の定期更新**: `npm audit`で脆弱性チェック

## 今後の拡張可能性

### 実装済み

- ✅ 紙の自動検出
- ✅ 台形補正
- ✅ 角の手動調整
- ✅ 左右分割
- ✅ タップで比較
- ✅ PWA化（manifest + Service Worker + OGP）
- ✅ QRコード共有
- ✅ ヘッダバナー
- ✅ SEO土台（robots.txt / sitemap.xml / JSON-LD / meta description）
- ✅ 多言語ルーティング（日本語 `/` + 英語 `/en`、hreflang 相互リンク）

### 今後の候補

- 差分の自動検出
- 画像の保存機能
- SNSシェア機能
- 複数の間違い探しを管理
