# フロントエンド設計変更（大リファクタリング）の判断ポイント

**日付**: 2026-04-17
**判断者**: AI Agent (AGENTS.md ガイダンス適用)

## 背景
これまで `Frontend/src/app` 内にフラットおよび無秩序に管理されていたコンポーネント、フック、外部通信処理が密結合になりつつありました。特に `App.tsx`（約650行）は単独で、音声認識フック、データベース制御、API制御、DOM操作、ならびにレイアウトロジックを統合しており、可読性と保守性が低下していました。

## 実施した変更
`AGENTS.md` の「TalkScope フロントエンド・アーキテクチャ設計書」に基づき、以下の階層構造へ分離を行いました。

- **Domain層**: 用語(`terms.ts`)、レイアウト定義(`layoutTypes.ts`)など、React非依存の型とロジック(`termDetection.ts` など)。
- **Infrastructure層**: 外部API通信、および IndexedDB ローカル保存処理(`db`ディレクトリ群)の集約。
- **Application層**: 再利用可能な Custom Hooksへの抽出(`useReferDict`, `useWorkspaceLayout`, `useTermVectors`, `useSessionTerms`)。これにより状態管理を分離。
- **Presentation層**: 見た目のみに関心を持つUI部品群と画面レイアウトの実装領域。
- **Shared層**: 各層から呼ばれる純粋で共通なユーティリティ群（SentenceSplit 等）。

## App.tsx の責務縮小に関する判断
`App.tsx` 自体の行数を減らすため、以下の3つの巨大なHooksへ機能を移譲しました。
1. **`useSessionTerms`** - ActiveTermの抽出やピン留め、削除ライフサイクルの管理
2. **`useWorkspaceLayout`** - パネルの表示状態とユーザー設定
3. **`useTermVectors`** - 類似度計算用ベクトルの取得と計算

この構造変更により、今後の機能追加時に「コンポーネントのUI」と「データ取得ロジック」を切り離してテスト・実装できる土台が構築されました。
