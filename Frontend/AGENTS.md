# TalkScope Frontend 開発ガイドライン

このファイルは、`TalkScope/Frontend` リポジトリにおいて開発を担当する AI エージェントおよび開発者向けの総合ガイドラインです。

---

## 1. 開発基本ルール・操作方針 (AGENTS Guidelines)

### 1.1 技術スタック

- **フレームワーク**: React + Vite
- **パッケージマネージャ**: Bun
- **スタイリング**: Vanilla CSS (指示がない限りTailwind等のフレームワークは避ける)

### 1.2 必須コマンド

```bash
# パッケージのインストール
bun install

# 開発サーバーの立ち上げ
bun run dev

# プロダクションビルド
bun run build
```

### 1.3 フロントエンド実装方針

1. **UXと検証速度の優先**
   - 音声入力から単語抽出、意味検索（タップ時の導線）までの一連の動作を直感的に行えるUIを構築します。
   - 動的なデザインを取り入れ、魅力的でモダンなUI（スムーズな画面変遷、ホバーエフェクト、読みやすいタイポグラフィなど）を意識してください。

2. **バックエンド（API）との結合**
   - 解析ロジック（FastAPI側）のAPIエンドポイント変更に柔軟に対応できるよう、API呼び出し部分を適切に分離してください。

3. **ブラウザ依存機能の扱い**
   - 音声認識などブラウザAPIに依存する機能は、Chrome系ブラウザでの動作検証を優先・保証してください。

### 1.4 エージェントへの指示（プロンプト等で意識すべきこと）

- UIを構築する際は、「プロトタイプだから適当で良い」と考えず、洗練されたものを目指すこと。
- 新しいルールや設計の変更があった場合は、本ドキュメントを随時アップデートすること。
- **コミットメッセージは日本語で記述**すること（プロジェクトのグローバルルール）。
- コーディング時の判断や設計変更の理由などは、キリのいいタイミングでドキュメントを新規作成し、`Frontend/docs/decisions/` に保存すること。
- `Frontend/docs/orders/` に保存するドキュメントは、実際に与えられたプロンプトや、そのプロンプトで実装した内容を保存すること。

---

## 2. ユビキタス言語辞典 (Ubiquitous Language)

このセクションは、TalkScopeの開発に関わる全てのメンバー（エンジニア、デザイナー、プロダクトオーナー）が共通認識を持つための言葉の定義です。コード内の変数名、クラス名、コンポーネント名は原則としてこの用語に従います。

### 2.1 知識・セッション領域 (Core Domain: Knowledge & Session)
「何を、どのように抽出して提供するか」に関連する用語です。

| 用語 (JP) | 用語 (EN) | 定義・説明 |
| :--- | :--- | :--- |
| **セッション** | **Session** | 現在行われている講演、LT、発表そのもの。 |
| **登壇者** | **Speaker** | セッションで話をする人。音声の供給源。 |
| **聴講者** | **Listener** | アプリの利用者。登壇者の話を理解しようとしている人。 |
| **文字起こし** | **Transcription** | 登壇者の音声をリアルタイムでテキスト化したストリーム。 |
| **重要単語** | **Term** | 発表内容から抽出されたIT用語。アプリが扱う最小の知識単位。 |
| **説明** | **Definition** | Termが持つ意味。簡易説明（Summary）と詳細説明（Detail）がある。 |
| **重要度** | **Importance** | そのセッションにおける単語の価値。0.0〜1.0のスコアで表される。 |
| **類義語** | **Synonym** | Termに関連する、あるいは言い換え可能な別の単語。 |
| **検知イベント** | **Detection** | 文字起こしの中から特定のTermが発見されたという事実。 |

### 2.2 プレゼンテーション・ユーザー体験領域 (Presentation & UX Domain)
「ユーザーがどのように情報を閲覧・操作するか」に関連する用語です。

| 用語 (JP) | 用語 (EN) | 定義・説明 |
| :--- | :--- | :--- |
| **ワークスペース** | **Workspace** | 画面全体の表示領域。複数のWindowの集合体。 |
| **ウィンドウ** | **Window** | 各機能を格納するコンテナ。リサイズや移動が可能。 |
| **ウィジェット** | **Widget** | Window内に表示される具体的な機能の実体（文字起こし表示器など）。 |
| **バブル** | **Bubble** | Termを円形で表示するUI要素。Importanceに応じて大きさが変化する。 |
| **マーキング** | **Marking** | Transcription内のTermを強調表示すること。 |
| **レイアウト** | **Layout** | Windowの配置、比率、分割状態に関する設定データ。 |
| **カスタマイズ** | **Customization** | 聴講者が自分好みにLayoutを変更する行為。 |
| **履歴** | **History** | セッション中に登場したTermの時系列リスト。 |

### 2.3 システム・ロジック領域 (System & Logic Domain)
「データがどのように処理されるか」に関連する技術的な振る舞いの用語です。

| 用語 (JP) | 用語 (EN) | 定義・説明 |
| :--- | :--- | :--- |
| **抽出器** | **Extractor** | テキストストリームからTermを特定するロジック。 |
| **分析器** | **Analyzer** | セッションの文脈を読み取り、TermのImportanceを算出するロジック。 |
| **同期** | **Synchronization** | 登壇者の進行と、聴講者の画面表示が一致している状態。 |
| **習熟度** | **Proficiency** | 聴講者のIT知識レベル。表示する情報のフィルタリングに使用する。 |
| **レイアウト管理者** | **LayoutManager** | Windowの移動やリサイズ、Docking操作を制御する基盤システム。 |

### 2.4 ウィンドウの種類 (Window Types)
今後の拡張性を考慮し、現在定義されているWindowの種類です。

- **TranscriptionWindow**: 文字起こしとマーキングを表示。
- **BubbleWindow**: 重要度に応じたバブルを表示。
- **DetailWindow**: 単語の詳細な説明を表示。
- **HistoryWindow**: 過去に登場した単語を一覧で表示。

### 2.5 命名規則の指針 (Naming Guidelines)
- **Boolean型**: `is`, `has`, `should` を接頭辞とする（例: `isAnalyzing`, `hasDetail`）。
- **イベントハンドラ**: `on` + `動詞`（例: `onTermClick`, `onLayoutChange`）。
- **非同期処理**: `fetch`, `update`, `analyze` などの動詞から始める。

---

## 3. フロントエンド・アーキテクチャ設計書

本セクションは、AIによって生成されたプロトタイプコードを、メンテナンス性と拡張性の高い「エンジニアのための設計」へとリファクタリング・維持するためのガイドラインです。

### 3.1 設計思想
- **Domain-Driven Design (Lite)**: 業務知識（ユビキタス言語）をコードの中心に据える。
- **Component-Based Architecture**: UIを「枠（Window）」と「機能（Widget）」に分離し、合成（Composition）によって構築する。
- **Engineering UX**: 開発者がコードを読みやすく、新しい機能を迷わず追加できる構造を維持する。

### 3.2 ディレクトリ構造 (Directory Structure)

```text
src/
├── domain/            # 【ドメイン層】依存関係を持たない純粋な定義
│   ├── models/        # Term, Session, Importance 等の型定義 (interface/type)
│   └── services/      # ImportanceAnalyzer 等のビジネスロジックのインターフェース
├── application/       # 【アプリケーション層】ユースケースと状態管理
│   ├── hooks/         # useTranscription, useLayout 等のドメインに紐付くHooks
│   └── usecases/      # 複数のモデルを横断する複雑な操作ロジック
├── presentation/      # 【プレゼンテーション層】UIの実装
│   ├── components/    # ボタンやカードなどの汎用UI部品 (Atomic Design)
│   ├── layouts/       # Workspace全体やグリッド・分割システムの管理
│   ├── windows/       # Window共通の枠組み（タイトルバー、リサイズ制御）
│   └── widgets/       # Window内に配置される各機能（Bubble, Detail等）
├── infrastructure/    # 【インフラ層】外部サービスとの接続
│   ├── api/           # 文字起こしAPI、外部辞書APIクライアント
│   └── storage/       # LocalStorage等へのLayoutSnapshot保存処理
└── shared/            # プロジェクト全体で利用する定数やユーティリティ
```

### 3.3 コンポーネント階層 (Component Hierarchy)

「Unity/VS Codeライクなレイアウト操作感」を実現するために、以下の階層構造でUIを構築する。

1. **Workspace (Root)**
   - アプリ全体の最上位コンテナ。
   - `LayoutManager` を保持し、各Windowの配置・比率・スタック順を制御する。
2. **Window (Container)**
   - 全てのウィンドウに共通の「枠」を提供する。
   - タイトルバー、閉じる/最小化ボタン、リサイズハンドル、ドラッグ移動の基盤を担当。
3. **Widget (Content)**
   - 各ドメイン機能の実体。Windowコンテナの中に注入される。
   - 例: `TranscriptionWidget`, `BubbleWidget`, `DetailWidget`, `HistoryWidget`

### 3.4 データフロー戦略 (Data Flow)

- **Unidirectional Data Flow**: 原則としてデータは上から下へ流す。
- **Custom Hooks as Presenters**: 複雑な状態管理や副作用（API通信）はコンポーネント内に直接書かず、必ず `application/hooks` に抽出し、UIは値を表示するだけに徹する。
- **Context API の限定利用**: レイアウト情報やセッションの基本情報など、アプリケーション全体で共有が必要な「真実の単一ソース (SSOT)」にのみContextを使用する。

### 3.5 リファクタリング実施手順 (Action Plan)

1. **モデルの定義 (Domain Layer)**
   - `src/domain/models/` にユビキタス言語に基づいた型定義を作成する。
2. **ロジックの抽出 (Application Layer)**
   - 既存の巨大なコンポーネントから、データ処理ロジックを `src/application/hooks/` に移譲する。
3. **UIの解体 (Presentation Layer)**
   - ページファイルに直接書かれたJSXを、`windows/` と `widgets/` に分割して再構成する。
4. **インフラの隠蔽 (Infrastructure Layer)**
   - `fetch` や WebSocket の直接呼び出しを、APIクライアントとして独立させ、モック（テストデータ）への差し替えを容易にする。

### 3.6 開発者への約束 (Engineering UX)
- 「どこに書けばいいか」迷った時は、このドキュメントのディレクトリ構造に戻ること。
- 新しいウィンドウを追加する際は、既存のコードを改変するのではなく、新しい `Widget` を作成し、定義済みの `Window` コンテナに差し込むこと。
- **「コードは書く時間より読まれる時間の方が長い」** ことを念頭に置き、自己説明的な命名を徹底する。