# test-spec-006: ウィンドウ個別設定 UI

## 日付

2026-05-20

## 対象ファイル

- `Frontend/src/presentation/layout/LayoutEngine.tsx`
- `Frontend/src/presentation/components/WindowSettingsPanel.tsx`
- `Frontend/src/presentation/windows/ImportanceRankingWindow/index.tsx`
- `Frontend/src/app/components/TermDetailPanel.tsx`
- `Frontend/src/app/components/BubbleCloud.tsx`
- `Frontend/src/app/components/TermBubble.tsx`
- `Frontend/src/app/components/SettingsModal.tsx`
- `Frontend/src/presentation/components/PresentationAppHeader.tsx`
- `Frontend/src/stores/transcriptionWindowSettingsStore.ts`
- `Frontend/src/stores/termMapWindowSettingsStore.ts`
- `Frontend/src/stores/importanceRankingWindowSettingsStore.ts`
- `Frontend/src/stores/detailWindowSettingsStore.ts`
- `Frontend/src/stores/historyWindowSettingsStore.ts`
- `Frontend/src/stores/__tests__/transcriptionWindowSettingsStore.test.ts`
- `Frontend/src/stores/__tests__/termMapWindowSettingsStore.test.ts`
- `Frontend/src/stores/__tests__/importanceRankingWindowSettingsStore.test.ts`
- `Frontend/src/stores/__tests__/detailWindowSettingsStore.test.ts`

## テストの目的

各ウィンドウの設定を共通ヘッダーの設定ボタンから変更できるようにしたため、以下を検証する。

- 全ウィンドウで同じ位置・同じアイコンから設定ポップアップを開けること
- 操作ウィンドウで文字起こしモードとマイクを変更できること
- 文字起こし、バブル、ランキング、説明ウィンドウの表示設定が保存・復元できること
- バブルとランキングウィンドウでは、ウィンドウ内にあったサイズ調整スライダーを設定ポップアップへ集約できていること
- 設定ポップアップ外側のクリックでポップアップが閉じること
- 既存のフック順序、ストア、レイアウト、重要度計算の単体テストを壊していないこと

## テスト項目

| # | テストケース | 種別 | 期待結果 |
|---|---|---|---|
| 1 | 文字起こしウィンドウ設定を保存する | 単体 | マスター、通常文字、重要単語のサイズが `localStorage` に保存される |
| 2 | バブルウィンドウ設定を保存する | 単体 | マスター、バブル、テキスト、自動切り替え、切り替え間隔が保存される |
| 3 | ランキングウィンドウ設定を保存する | 単体 | 要素サイズ、フォントサイズ、表示単語数が保存される |
| 4 | 説明ウィンドウ設定を保存する | 単体 | フォントサイズが保存される |
| 5 | 各設定ストアへ範囲外の値を入れる | 単体 | 定義済みの最小値・最大値へクランプされる |
| 6 | ランキングウィンドウでフォントを大きくし要素サイズを小さくする | 結合/手動 | フォントに必要な高さと順位バッジサイズが確保される |
| 7 | 設定ポップアップ外側をクリックする | 結合/手動 | 開いている設定ポップアップが閉じる |
| 8 | 全体ビルド | 結合 | TypeScript build と Vite build が成功する |
| 9 | 全体テスト | 結合 | 既存テストを含めて全件成功する |

## 実行結果

### 実行コマンド

```bash
cd Frontend
bun test
bun run build
```

| コマンド | 結果 | メモ |
|----------|------|------|
| `bun test` | 合格 | 85 件成功、0 件失敗 |
| `bun run build` | 合格 | TypeScript build と Vite build が成功。500kB 超のチャンク警告のみ |

`bun test` の内訳:

| 項目 | 件数 |
|------|------|
| 総テスト数 | 85 |
| 成功 | 85 |
| 失敗 | 0 |
| expect 呼び出し | 159 |
| テストファイル数 | 23 |

## 気づき・注意点

- ウィンドウ固有設定は各ストアで `localStorage` に保存する。ストアごとに保存キーを分け、設定値の責務を分離した。
- 設定ポップアップは `LayoutEngine` の共通 UI として扱い、外側クリックの閉じる挙動も全ウィンドウ共通にした。
- `bun test` は `Frontend/` をカレントディレクトリにして実行する。`bunfig.toml` の preload により DOM 環境が設定される。
