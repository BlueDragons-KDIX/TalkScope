# LexiFlow Frontend — 現状まとめ

> 最終更新: 2026-02-18

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
- レベル: `1`（初級）/ `2`（中級）/ `3`（上級）
- 各用語に `shortDesc`・`longDesc`・`relatedTerms`・`externalUrl` を保持

### 4. UI
- **ダークモード対応**（デフォルト: ダーク）
- **テーマカラー切替**: blue / indigo / purple / rose / emerald / orange
- **レベル切替**: おまかせ / 初級 / 中級 / 上級
- **検索履歴**: 最大 50 件保持

---

## 開発サーバー

```bash
cd Frontend
bun install
bun run dev
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
- [ ] 依存の定期更新（`bun update`）運用の確立

---

## 関連ドキュメント

- Bun移行の詳細: `BUN_MIGRATION.md`
