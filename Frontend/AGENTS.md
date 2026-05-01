# Frontend/AGENTS.md — AI / 開発作業ルール

このディレクトリは **TalkScope フロントエンド**（React + TypeScript + Vite）のコードを置く場所です。
リポジトリ全体のルールはルートの `AGENTS.md` に従い、**本ファイルは `Frontend/` 配下での作業を優先**します。

---

## 作業前に読むドキュメント

| 優先度 | パス | 内容 |
|--------|------|------|
| 必須 | `Frontend/docs/orders/order-001.md` | 初回設計決定・リファクタリング方針 |
| 推奨 | `Frontend/docs/orders/order-002.md` | ツールバー・デモ重要語・グローバルリセット等の追補指示 |
| 必須 | `Frontend/docs/ADRs/` | 技術・設計の意思決定記録 |
| 補足 | `Frontend/docs/tests/` | テスト仕様・結果 |

---

## アーキテクチャと技術

- **クリーンアーキテクチャ**を前提に、依存の向きを守る
  - `domain/` → 外部依存なし（純粋な型・インターフェースのみ）
  - `application/` → `domain/` にのみ依存
  - `infrastructure/` → `domain/` `application/` に依存
  - `presentation/` → すべての層を使用可
- **テスト駆動（TDD）**で進める。先に振る舞いをテストで表し、実装を合わせる
- 状態管理は **Zustand** を使用。ドメインごとにストアを分割する
- UI は **React 19 + TypeScript + Tailwind CSS v4**

### ディレクトリ構造

```
Frontend/src/
├── domain/                    # 型・インターフェース定義のみ（外部依存なし）
│   ├── entities/              # エンティティ（Term, Bubble, Layout, Minutes）
│   └── interfaces/            # DI契約（IImportanceStrategy, IWindowDefinition, ITranscriptionService, IPhase）
├── application/               # ユースケース
│   ├── transcription/
│   ├── bubble/
│   ├── layout/
│   └── phase/
├── infrastructure/            # 外部依存の具体実装
│   ├── speech/                # WebSpeechAPI実装
│   ├── importance/            # 重要度アルゴリズム実装群
│   └── storage/               # localStorage/IndexedDB
├── stores/                    # Zustandストア群
├── presentation/              # React UI
│   ├── App.tsx                # フェーズ切替・グローバルツールバー（テスト／リセット／表示）。ロジックはストア／フックへ
│   ├── phases/                # 発表中・発表後のシーン管理
│   ├── windows/               # ウィンドウ種別（拡張可能）
│   ├── layout/                # レイアウトエンジン
│   ├── components/            # 汎用UI・ツールバー用パーツ（例: TestFeaturesPopover）
│   ├── context/               # デモストリーム等の React Context
│   └── hooks/                 # useTranscription, useDemoImportantTermsSync 等
└── debug/                     # デモデータ・デモ専用フック（ペイロードはここに寄せる）
```

---

## 設計原則

- **文字起こしとメインシステムは完全に分離する**
  - `TranscriptionWindow` はテキストを表示・録音操作する（プレゼンレイヤではフッターのリセットは非表示）
  - フロントエンド側での単語抽出は行わない（検証用は `debug/demo/mockImportantTerms` のモックのみ。詳細は ADR-007）
  - 将来: 文字起こし → サーバーへ送信 → サーバーで重要語抽出 → フロントへ反映
- **バブル重要度はDI（依存性注入）で実装する**
  - `IImportanceStrategy` インターフェースを実装して差し替え可能にする
- **ウィンドウはポリモーフィズムで拡張する**
  - `IWindowDefinition` インターフェースを実装して `windows/registry.ts` に登録する
  - 新種別の追加時はインターフェース実装 + レジストリ登録だけでよい
- **フェーズ（シーン）はポリモーフィズムで拡張する**
  - `IPhase` インターフェースを実装して `phases/registry.ts` に登録する
  - 現在: `DuringPresentation`（発表中）/ `AfterPresentation`（発表後）
- **デモ用のペイロード・アルゴリズムは `debug/` に寄せる**
  - デモテキスト、`useDemoStream`、サーバー代替のモック重要語リストなどは `debug/demo/` に置く
  - 画面上部ツールバーから開くポップアップ／モーダルなどのアプリシェルは `presentation/` に置いてよい（境界は ADR-007）
- **不要な拡張性は持たせない**（将来のためだけにある抽象化は避ける）
- 仕様や責務を**独自に広げる判断**が必要なときは、実装前に**担当者へ確認**する

---

## フェーズシステム

アプリは2つのフェーズを持つ。フェーズごとにレイアウトは独立している。

| フェーズID | 名前 | 内容 |
|---|---|---|
| `during` | 発表中 | 文字起こし・バブル・単語詳細・履歴 |
| `after` | 発表後 | 議事録（オンデマンド生成）・今後拡張予定 |

- 発表終了ボタンで `during` → `after` へ遷移
- 各フェーズは `IPhase` を実装し `phases/registry.ts` に登録する

---

## テスト

- **単体テスト**はこまめに実行する（`bun test`）
- **結合テスト**は機能単位・区切りのよいタイミングで行う
- テストコードの置き場所は **`Frontend/src/**/__tests__/`** または **`Frontend/src/**/*.test.ts(x)`**
- テスト内容の説明・意図・結果は **`Frontend/docs/tests/`** に記す

---

## ドキュメント運用（`Frontend/docs/`）

区切りのよいタイミングで頻繁にドキュメントを更新する。

| ディレクトリ | 内容 | ファイル名規則 |
|---|---|---|
| `docs/ADRs/` | 技術・設計の意思決定（なぜそうしたか） | `adr-001.md`, `adr-002.md`, … |
| `docs/orders/` | 担当者からの指示の要約（振り返り用） | `order-001.md`, `order-002.md`, … |
| `docs/tests/` | テストの要約（何を・なぜ・結果） | `test-001.md`, `test-002.md`, … |

番号は欠番を避け、**連番で採番**する。

---

## Git・ブランチ運用

| 役割 | 内容 |
|---|---|
| **作業ブランチ** | `claude/adoring-lumiere-94e59f` … リファクタリング作業の集約ブランチ |
| **サブブランチ** | `feature/refactor/phase*` … 各フェーズの実装ブランチ。完了後に作業ブランチへマージ |
| **AIがpushしてよい先** | なし（pushは担当者が行う） |

### AIに禁止すること

- **`main` への `git push`** および **`main` への直接マージ**
- **指示なしのリモートへの `git push`**（ローカルコミット・マージは自由）

### コミット

- こまめに区切りのよい単位でコミットする
- **コミットメッセージは日本語**で記述する
