# LexiFlow Frontend — 現状まとめ

> 最終更新: 2026-02-20

---

## 概要

**LexiFlow** は、音声をリアルタイムで文字起こしし、IT 専門用語を自動検出・解説する Web アプリケーションです。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 6 |
| スタイリング | Tailwind CSS v4（`@tailwindcss/vite` プラグイン） |
| UI コンポーネント | shadcn/ui（Radix UI ベース） |
| アニメーション | Motion (motion/react) |
| アイコン | lucide-react |
| トースト通知 | sonner |
| パッケージ管理 | Bun |

---

## ディレクトリ構成

```
Frontend/
├── index.html                  # Vite エントリポイント
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                # React エントリポイント
    ├── styles/
    │   ├── index.css           # スタイルのまとめ（@import）
    │   ├── tailwind.css        # Tailwind v4 設定
    │   ├── fonts.css           # フォント設定
    │   └── theme.css           # カスタムテーマ変数
    └── app/
        ├── App.tsx             # ルートコンポーネント（バブル管理・state）
        ├── components/
        │   ├── TranscriptionView.tsx   # 音声文字起こし表示
        │   ├── BubbleCloud.tsx         # 用語バブルマップ
        │   ├── TermBubble.tsx          # 個別用語バブル
        │   ├── TermDetailPanel.tsx     # 用語詳細パネル
        │   ├── HistoryPanel.tsx        # 検索履歴パネル
        │   ├── SettingsModal.tsx       # 設定モーダル
        │   └── ui/                     # shadcn/ui コンポーネント群
        ├── data/
        │   └── terms.ts        # IT 用語データ
        ├── demo/
        │   └── demo.ts         # デモテキスト定義
        ├── hooks/
        │   ├── useSpeechRecognition.ts # Web Speech API フック
        │   └── useDemoStream.ts        # デモストリーミングフック
        ├── layout/
        │   ├── types.ts        # LayoutNode バイナリツリー型定義
        │   ├── layoutUtils.ts  # ツリー操作・プリセット 5 種類
        │   └── LayoutEngine.tsx# 再帰レンダリング・DnD・リサイズ
        └── utils/
            └── termDetection.ts        # 用語抽出・ハイライトロジック
```

---

## 主要機能

### 1. 音声認識（`useSpeechRecognition`）
- Web Speech API（`webkitSpeechRecognition`）を使用
- 日本語（`ja-JP`）でリアルタイム文字起こし
- `continuous: true` / `interimResults: true` で連続認識
- `onend` で自動再起動（ブラウザの強制停止に対応）

### 2. 用語検出（`termDetection.ts`）
- `extractTerms`: テキストから IT 用語を抽出（英語・かな両対応）
- `highlightTerms`: テキスト内の用語をマークアップ（長い単語優先マッチ）

### 3. 用語データ（`terms.ts`）
- カテゴリ: `Frontend` / `Backend` / `Infra` / `AI/Data` / `General`
- 各用語に `shortDesc`・`longDesc`・`relatedTerms`・`externalUrl` を保持

### 4. バブルマップ（`BubbleCloud.tsx` / `TermBubble.tsx`）

#### バブルライフタイム管理（スマート削除）
バブルの消去はすべて `App.tsx` で 2 秒ごとのポーリングにより行う。

| 条件 | 挙動 |
|---|---|
| バブル数 ≤ 12（ソフト上限） | 削除なし |
| バブル数 13〜20 | 最低スコアのバブルを 1 件ずつ削除 |
| バブル数 > 20（ハード上限） | ソフト上限まで一括削除 |
| 追加から 20 秒以内の新出バブル | 削除対象から除外（猶予期間） |
| 文字起こしに再登場した用語 | タイムスタンプをリセット（猶予期間を延命） |
| ピン留め済みバブル | 上限・スコアに関係なく永続 |

**興味スコア（時間減衰）**
```
score = クリック回数 × exp(−経過時間 / 5分)
```
最後にクリックされた時刻を基準に計算。古いクリックほど価値が下がる。

**透明フィードバック**
- 次に消えそうなバブル上位 3 件を `opacity-40 + grayscale-40%` で警告表示
- ホバー時は一時的に完全表示に戻る

#### ピン留め機能（★）
- バブル右上の ☆ ボタン or 詳細パネルの「ピン」ボタンでトグル
- ピン中は黄色 ★（グロー付き）で強調表示
- ピン解除時はその時点から猶予タイマーが再スタート

#### その他
- カテゴリフィルタ（ALL / Frontend / Backend / Infra / AI/Data / General）
- **自動切換えボタン**: 用語を自動ローテーション表示（1〜10 秒スライダー）
- クリック回数に比例してバブルサイズが大きくなる

### 5. 動的レイアウトエンジン（`layout/`）
- VSCode / Unity 風のパネル自由配置
- ドラッグ＆ドロップでパネルを上下左右に移動・分割
- 分割線ドラッグでリサイズ
- 5 種類のプリセットレイアウト（デフォルト / 左右 / 2×2 / 横4列 / 縦4列）
- 全パネルの枠・ヘッダー・仕切り線がアクセントカラーと連動

### 6. その他 UI
- **ダークモード対応**（デフォルト: ダーク）
- **テーマカラー切替**: blue / indigo / purple / rose / emerald / orange
- **検索履歴パネル**: 最大 50 件、履歴内検索機能付き

---

## 開発サーバー

```bash
cd Frontend
bun install
bun run dev
# → http://localhost:5173/
```

---

## 変更履歴

### 2026-02-20
- **バブルライフタイム v2.0（スマート削除）** を実装（`App.tsx`, `BubbleCloud.tsx`, `TermBubble.tsx`）
  - 旧 30 秒タイマー廃止
  - 時間減衰スコアによる優先削除（`クリック数 × exp(−t / 5min)`）
  - ソフト上限 12 / ハード上限 20 件
  - 新出バブル猶予期間 20 秒
  - 再出現延命（文字起こしに再登場したらタイムスタンプリセット）
  - 低興味バブルの透明フィードバック（opacity-40 + grayscale）
- **ピン留め機能（★）** を実装（`TermBubble.tsx`, `TermDetailPanel.tsx`）
  - バブル右上の星ボタン（ホバー時表示）
  - 詳細パネルヘッダーの「ピン / ピン中」ボタン
  - ピン済みは削除対象外・黄色グロー表示

### 2026-02-19
- ログイン機能を完全削除（`SettingsModal.tsx`）
- レベル指定（初級/中級/上級）機能を完全削除（`App.tsx`, `BubbleCloud.tsx`, `TermBubble.tsx`, `SettingsModal.tsx`）
- **自動切換えボタン**を用語マップヘッダーに追加（`BubbleCloud.tsx`）
- **自動切換えスピードスライダー**（1〜10 秒）をボタン隣に追加（`BubbleCloud.tsx`）
- **VSCode/Unity 風動的レイアウトエンジン**を実装（`layout/` ディレクトリ新設）
  - `types.ts`: LayoutNode バイナリツリー型定義
  - `layoutUtils.ts`: ツリー操作・プリセット 5 種類
  - `LayoutEngine.tsx`: 再帰レンダリング・DnD・リサイズ
  - 詳細・履歴パネルを独立パネルに分離
- **パネル枠のアクセントカラー連動**
- **フルスクリーン対応**: `html`/`body`/`#root` に `height: 100%` を追加
