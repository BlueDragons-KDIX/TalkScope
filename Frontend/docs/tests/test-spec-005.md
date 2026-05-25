# test-spec-005: レイアウトテンプレート作成・保存機能

## 日付

2026-05-20

## 対象ファイル

- `Frontend/src/presentation/components/TestFeaturesPopover.tsx`
- `Frontend/src/presentation/components/LayoutPresetMenu.tsx`
- `Frontend/src/presentation/layout/ScriptableLayoutTemplates.ts`
- `Frontend/src/presentation/layout/layoutTemplateFormat.ts`
- `Frontend/src/presentation/layout/__tests__/layoutTemplateFormat.test.ts`
- `Frontend/src/stores/layoutTemplateStore.ts`
- `Frontend/src/stores/__tests__/layoutTemplateStore.test.ts`
- `Frontend/src/stores/index.ts`

## テストの目的

このブランチで追加したレイアウトテンプレート機能について、以下を検証する。

- GUIで調整した現在のレイアウトを、テストポップオーバーからコピーできること
- コピーしたレイアウトを `ScriptableLayoutTemplates` に貼り付け、標準レイアウトとして扱えること
- レイアウトボタンではスクリプトテンプレートを標準一覧として表示すること
- ユーザーが独自に作ったオリジナルレイアウトを名前付きで保存し、ローカルストレージから再利用できること
- オリジナルレイアウトを削除したとき、ローカルストレージからも削除されること
- オリジナルレイアウトの保存数を現実的な上限である5個に制限すること

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | 現在レイアウトのコピー文字列を生成する | 手動 | `createXxxLayout(): LayoutNode { ... }` 形式でコピーできる |
| 2 | コピー用メソッド形式を解析する | 単体 | `LayoutNode` として読み込める |
| 3 | 素のJSON形式を解析する | 単体 | `LayoutNode` として読み込める |
| 4 | 不正なレイアウト情報を解析する | 単体 | 例外を投げる |
| 5 | スクリプトテンプレートを標準一覧として表示する | 手動 | `デフォルト` / `バブル重視` / `重要リスト重視` / `フルカスタム` がレイアウトボタンに表示される |
| 6 | オリジナルレイアウトを追加する | 単体/手動 | 名前と現在レイアウトが保存され、ローカルストレージにも反映される |
| 7 | オリジナルレイアウトを削除する | 単体/手動 | 一覧とローカルストレージの両方から削除される |
| 8 | オリジナルレイアウトを6個以上保存する | 単体 | 最大5個を超える追加は拒否される |
| 9 | 全体ビルド | 結合 | TypeScript build と Vite build が成功する |
| 10 | 全体テスト | 結合 | 既存テストを含めて全件成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun run build
bun test
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun run build` | 合格 | TypeScript build と Vite build が成功 |
| `bun test` | 合格 | 74 件成功、0 件失敗 |

`bun test` の内訳:

| 項目 | 件数 |
|------|------|
| 総テスト数 | 74 |
| 成功 | 74 |
| 失敗 | 0 |
| expect 呼び出し | 123 |
| テストファイル数 | 20 |

## 気づき・注意点

- オリジナルレイアウトの上限は5個とした。メニュー内で一覧性を保ちやすく、ローカルストレージにも十分軽いため。
- スクリプトテンプレートはコードで管理する標準レイアウト、オリジナルテンプレートはユーザーがローカルに保存する個人用レイアウトとして分離する。
- オリジナルテンプレートは `talkscope:original-layout-templates` に保存する。
- React Testing Library を使うテストがあるため、テストは `Frontend/` をカレントディレクトリにして実行する。
