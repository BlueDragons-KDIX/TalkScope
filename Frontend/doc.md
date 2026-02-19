# LexiFlow Frontend — 現状まとめ

> 最終更新: 2026-02-19

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
| パッケージ管理 | npm |

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
        ├── App.tsx             # ルートコンポーネント
        ├── components/
        │   ├── TranscriptionView.tsx   # 音声文字起こし表示
        │   ├── BubbleCloud.tsx         # 用語バブルマップ
        │   ├── TermBubble.tsx          # 個別用語バブル
        │   ├── TermDetailModal.tsx     # 用語詳細モーダル
        │   ├── SettingsModal.tsx       # 設定モーダル
        │   ├── HistoryModal.tsx        # 検索履歴モーダル
        │   └── ui/                     # shadcn/ui コンポーネント群
        ├── data/
        │   └── terms.ts        # IT 用語データ（14 件）
        ├── hooks/
        │   └── useSpeechRecognition.ts # Web Speech API フック
        └── utils/
            └── termDetection.ts        # 用語抽出・ハイライトロジック
```

---

## 主要機能

### 1. 音声認識（`useSpeechRecognition`）
- Web Speech API（`webkitSpeechRecognition`）を使用
- 日本語（`ja-JP`）でリアルタイム文字起こし
- `continuous: true` / `interimResults: true` で連続認識

### 2. 用語検出（`termDetection.ts`）
- `extractTerms`: テキストから IT 用語を抽出（英語・かな両対応）
- `highlightTerms`: テキスト内の用語をマークアップ（長い単語優先マッチ）

### 3. 用語データ（`terms.ts`）
- 14 件の IT 用語を収録
- カテゴリ: `Frontend` / `Backend` / `Infra` / `AI/Data` / `General`
- 各用語に `shortDesc`・`longDesc`・`relatedTerms`・`externalUrl` を保持

### 4. UI
- **ダークモード対応**（デフォルト: ダーク）
- **テーマカラー切替**: blue / indigo / purple / rose / emerald / orange
- **検索履歴**: 最大 50 件保持
- **自動切換えボタン**（`BubbleCloud.tsx`）: 用語マップグリッド内の用語をランダムに自動選択し詳細表示を切り替える
  - スピードスライダー: 1〜10 秒で切換え間隔をアナログ調整可能
- **動的レイアウトエンジン**（`layout/`）: VSCode/Unity 風のパネル自由配置
  - 各パネルのドラッグ＆ドロップで隣接パネルの左右上下に移動・分割
  - 分割線ドラッグでリサイズ
  - ヘッダーから 5 種類のプリセットレイアウトを切り替え可能
  - 全パネルの枠・ヘッダー・仕切り線がアクセントカラーと連動して変化

---

## 開発サーバー

```bash
cd Frontend
npm install
npm run dev
# → http://localhost:5173/
```

---

## Git 状態（2026-02-18 時点）

- ブランチ: `feature/front-base-design`
- HEAD: `eb4349e7` (Initial commit)
- ステージング済み: フロントエンドのソースコード一式（`node_modules` は `.gitignore` で除外済み）

---

## 今後の課題・TODO

- [ ] IT 用語データの拡充（現在 14 件）
- [ ] バックエンド API との連携（用語解説の動的取得）
- [ ] テストコードの追加
- [ ] `package-lock.json` の `.gitignore` 除外要否の検討

## 変更履歴

### 2026-02-19
- ログイン機能を完全削除（`SettingsModal.tsx`）
- レベル指定（初級/中級/上級）機能を完全削除（`App.tsx`, `BubbleCloud.tsx`, `TermBubble.tsx`, `SettingsModal.tsx`）
- **自動切換えボタン**を用語マップヘッダーに追加（`BubbleCloud.tsx`）
- **自動切換えスピードスライダー**（1〜10 秒）をボタン隣に追加（`BubbleCloud.tsx`）
- **ドラッグリサイズ可能な 3 カラムレイアウト**を実装（`App.tsx`）
- **VSCode/Unity 風動的レイアウトエンジン**を実装（`layout/` ディレクトリ新設）
  - `types.ts`: LayoutNode バイナリツリー型定義
  - `layoutUtils.ts`: ツリー操作・プリセット 5 種類
  - `LayoutEngine.tsx`: 再帰レンダリング・DnD・リサイズ
  - 詳細・履歴パネルを独立パネルに分離
- **パネル枠のアクセントカラー連動**: 全パネルの枠・ヘッダー背景・仕切り線が設定のアクセントカラーで統一表示
- **フルスクリーン対応**: `html`/`body`/`#root` に `height: 100%` を追加し画面全体にレイアウトが広がるよう修正（`tailwind.css`, `App.tsx`）
