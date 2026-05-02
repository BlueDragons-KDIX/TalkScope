# Frontend

TalkScope（LexiFlow）のフロントエンドです。音声認識、文字起こし、用語のハイライト／バブル表示、履歴、レイアウト分割 UI を担当します。

エントリポイントは `src/main.tsx` → **`src/presentation/App.tsx`**（クリーンアーキテクチャ構成）。レガシーな単一画面実装は `src/app/App.tsx` に残っていますが、通常の開発ではプレゼンレイヤを前提にしてください。

## 技術スタック

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- Bun（パッケージ管理・テスト）

## セットアップ

```bash
cd Frontend
bun install
bun run dev
```

- 開発サーバー: `http://localhost:5173`
- 推奨ブラウザ: Chrome 系（Web Speech API 利用のため）

### Transcript Focus Lab（解析試作）

本番の Vite アプリとは別に、ブラウザだけで動く重要語スコアリングの試作があります。`transcript-focus-lab/index.html` を開いて利用します（手順は `transcript-focus-lab/README.md`）。

## テスト

```bash
cd Frontend
bun test
```

テスト仕様のまとめは `docs/tests/test-spec-001.md`（ベース）および `docs/tests/test-spec-002.md`（追補）を参照。

## Docker で起動

リポジトリルートで実行してください（Makefile のパスは環境に合わせて読み替え）。

```bash
make up-frontend
```

初回や Dockerfile 更新後に再ビルドしたい場合:

```bash
make up-frontend-build
```

Docker の build cache が溜まって容量不足になった場合:

```bash
make docker-clean
```

- URL: `http://localhost:5173`
- HTTPS 開発サーバーが必要な場合は `VITE_USE_HTTPS=true` を設定

## 現在の主要機能（プレゼンレイヤ）

- **発表中／発表後フェーズ**とフェーズ別レイアウト（永続化は `LayoutRepository`）
- **グローバルツールバー**（`PresentationAppHeader`）: 設定モーダル（ダークモード・アクセント）、全ウィンドウリセット、レイアウトプリセット（発表後は表示のみ・無効）、同一サイズのピル型で「発表終了」／「もどる」を切替。開発者向けテストポップアップは開発ビルド時のみ左側に表示（`import.meta.env.DEV`）
- **アクセント色**: 発表中は設定色、発表後は補色に近いテーマへ自動切替（`getOppositeThemeColor`／詳細は `docs/ADRs/adr-008.md`）
- **音声認識**（`ja-JP`）とリアルタイム文字起こし（`WebSpeechTranscriptionService` → `transcriptStore`）
- **用語のハイライト・バブル**（`termStore`；将来はサーバー由来。検証用モックは `src/debug/demo/mockImportantTerms.ts`）
- **検索履歴・詳細パネル**（ウィンドウ分割で表示）

開発ルールとディレクトリの意味付けは **`AGENTS.md`** を参照。

## ディレクトリ概要

```txt
Frontend/
├── docs/
│   ├── ADRs/           # 設計判断（例: adr-007 ツールバー、adr-008 ヘッダーとアクセント切替）
│   ├── orders/         # 指示の要約
│   └── tests/          # テスト仕様メモ
├── src/
│   ├── domain/         # エンティティ・インターフェース（外部依存なし）
│   ├── application/    # ユースケース
│   ├── infrastructure/ # WebSpeech・ストレージ・重要度ストラテジ等
│   ├── stores/         # Zustand
│   ├── presentation/   # メイン UI（App, phases, windows, layout）
│   ├── debug/demo/     # デモテキスト・モック重要語・useDemoStream
│   ├── app/            # 共有コンポーネント・レガシー App 等
│   ├── styles/
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## 類似度の検証（レガシー／ユーティリティ）

バブルサイズに使う類似度ロジックのスモーク確認:

```bash
cd Frontend
bun run verify:similarity
```

## 開発メモ

- 重要語の本番ソースは **サーバー連携後に transcript を送信して反映**する想定（フロント単体での辞書抽出はリファクタ方針により廃止）。
- デモ重要語マーキングは **オプションの検証用**（`demoImportantMarkingStore` + `useDemoImportantTermsSync`）。
- UI 検証の速度を優先するため、ログインなしで利用できる設計。
