# test-spec-004: 操作ウィンドウ UX・最小サイズ

## 日付

2026-05-15

## 対象ファイル

- `Frontend/src/presentation/windows/SystemControlWindow/index.tsx`
- `Frontend/src/presentation/components/PhaseTransitionButton.tsx`
- `Frontend/src/presentation/constants/systemControlWindow.ts`
- `Frontend/src/presentation/layout/LayoutEngine.tsx`
- `Frontend/test-setup.ts`
- `Frontend/bunfig.toml`

## 対象ブランチ

`feature/system-control-reset-button-size`

## テストの目的

このブランチで変更した操作ウィンドウについて、以下を確認する。

- 録音／発表終了／リセットの 3 ボタンが、横長・縦長・中間比率で破綻なく配置されること
- 録音と発表終了を同格の主操作、リセットを低優先の副操作として認識できること
- 最小幅・最小高さを下回るリサイズで、ボタンが画面外に移動しないこと
- 操作ウィンドウの高さ下限が CSS だけでなく、ドラッグ時の分割比率にも反映されること
- React Testing Library を使う `.tsx` テストで happy-dom の DOM 環境が正しく登録されること

## 参照したルール・設計文書

- ルート `AGENTS.md`
- `Frontend/AGENTS.md`
- `Frontend/docs/orders/order-001.md`
- `Frontend/docs/ADRs/adr-001.md` 〜 `adr-008.md`

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | `bun run build` | 自動 | TypeScript build と Vite build が成功する |
| 2 | `bun test` | 自動 | 既存の単体・結合テスト 68 件がすべて成功する |
| 3 | 横長の操作ウィンドウ | 手動 | 録音／発表終了／リセットが横一列に並び、見切れない |
| 4 | 縦長の操作ウィンドウ | 手動 | 3 ボタンが縦一列に並び、主操作と副操作の優先度が分かる |
| 5 | 中間比率の操作ウィンドウ | 手動 | 録音／発表終了が主操作、リセットが右下寄りの副操作として表示される |
| 6 | 最小幅方向へのリサイズ | 手動 | 操作ウィンドウが最小幅以下に潰れず、ボタンが画面外に移動しない |
| 7 | 最小高さ方向へのリサイズ | 手動 | 操作ウィンドウが最小高さ以下に潰れず、ボタンが画面外に移動しない |
| 8 | 最小サイズ以上でのリサイズ | 手動 | 最大幅・最大比率による固定化がなく、従来どおり自由にリサイズできる |
| 9 | リセット確認ダイアログ | 手動 | リセット押下で確認が表示され、キャンセル時は状態が維持される |
| 10 | レイアウトエンジン回帰 | 手動 | 操作ウィンドウ以外のドラッグ移動・リサイズが破綻しない |

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
| `bun test` | 合格 | 68 件成功、0 件失敗 |

`bun test` の内訳:

| 項目 | 件数 |
|------|------|
| 総テスト数 | 68 |
| 成功 | 68 |
| 失敗 | 0 |
| expect 呼び出し | 115 |
| テストファイル数 | 17 |

### 通過した主な範囲

- `termStore`
- `phaseStore`
- `transcriptStore`
- `accentStyles`
- `TermDetailPanel`
- `LayoutUseCase`
- `BubbleImportanceUseCase`
- `VectorSimilarityStrategy`
- `FrequencyStrategy`
- `LayoutRepository`
- `Term` / `Layout` entity
- `importanceRanking`
- `oppositeThemeColor`
- `transcriptionModeSync`
- `useTranscriptionModeBroadcast`
- `mockImportantTerms`

## 気づき・注意点

- React Testing Library を使う `.tsx` テストは DOM 環境を必要とする。
- このリポジトリでは `Frontend/bunfig.toml` の `[test].preload` から `Frontend/test-setup.ts` を読み込み、happy-dom を登録する。
- テストは必ず `Frontend/` をカレントディレクトリにして実行する。

リポジトリルートから `bun test` を直接実行すると `Frontend/bunfig.toml` が読まれず、`document is not defined` が発生する可能性がある。特に影響するテストは以下。

- `src/app/components/__tests__/TermDetailPanel.test.tsx`
- `src/presentation/hooks/__tests__/useTranscriptionModeBroadcast.test.tsx`

## 手動テストチェックリスト

`bun run dev` でプレゼン画面を開き、Chrome 系ブラウザで確認する。

### 操作ウィンドウのリサイズ

- [ ] 操作ウィンドウを横長にしたとき、3 ボタンが横一列に並ぶ
- [ ] 操作ウィンドウを縦長にしたとき、3 ボタンが縦一列に並ぶ
- [ ] 中間比率では、録音／発表終了が主操作として見え、リセットが右下寄りの副操作として見える
- [ ] 極小に近いサイズでも、ボタン文言やアイコンが画面外に移動しない
- [ ] 最小幅を下回る方向へドラッグしても、操作ウィンドウがそれ以上潰れない
- [ ] 最小高さを下回る方向へドラッグしても、操作ウィンドウがそれ以上潰れない
- [ ] 最小サイズ以上では、従来どおり自由にリサイズできる

### ボタンの UX

- [ ] 録音ボタンと発表終了ボタンが同程度の重要度に見える
- [ ] リセットボタンが他 2 つより少し小さく、低優先の操作として見える
- [ ] 録音開始／一時停止／再開の状態変化でボタンが見切れない
- [ ] リセット押下時に確認ダイアログが表示される
- [ ] リセット確認ダイアログでキャンセルすると状態が維持される

### レイアウトエンジン回帰

- [ ] 操作ウィンドウ以外のウィンドウをドラッグ移動できる
- [ ] 操作ウィンドウを含むレイアウトでも、他ウィンドウのリサイズが破綻しない
- [ ] 操作ウィンドウの最大幅・最大比率による固定化が起きていない
- [ ] 発表中フェーズと発表後フェーズの両方で操作ウィンドウが表示される

## 自動テスト対象外

- 実マイク入力と Web Speech API の E2E
- ローカル STT サーバーとの接続確認
- 操作ウィンドウの細かな視覚バランス
- ユーザー環境ごとのブラウザリサイズ挙動

上記は `bun run dev` での手動確認を正とする。

## 判定

自動テストは合格。
操作ウィンドウの視覚的な最終判定は、セクション 4 の手動チェックリストで確認する。
