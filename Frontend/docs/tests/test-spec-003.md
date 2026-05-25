# テスト仕様書 003 — 2026-05-14（PR #26〜#29：手動確認と自動テスト）

作成日: 2026-05-14  
対象: `develop/v0` にマージ済みの PR #26〜#29  
テストランナー: Bun Test  

**自動テスト一式**（happy-dom / `@testing-library/react` / 各 `*.test.ts(x)`）は **PR #30**（ブランチ `test/spec-2026-05-14-transcription-accent-termdetail`）で追加。`develop/v0` に取り込み後は `cd Frontend && bun test` で実行する。

> **参照**: `Frontend/AGENTS.md`、`test-spec-001.md` / `test-spec-002.md` の方針に従う。

---

## 1. スコープ一覧（PR）

| PR | 概要 | 自動テスト（PR #30） | 手動確認の重点 |
|----|------|----------------------|----------------|
| #26 アクセントテーマ | テーマ色・`AccentThemeProvider`・レイアウトの色味・録音ボタン配色（紫／緑）等 | `accentStyles` 単体 | 設定で色変更後、チップ・ヘッダー・パネル薄色が追従するか |
| #27 文字起こしモード同期 | `useTranscription` と `getTranscriptionService()` の一致 | `transcriptionModeSync` / `useTranscriptionModeBroadcast` | `fast` / `accurate` 切替後、操作ドックの録音が期待モードで動くか |
| #28 TermDetailPanel | `term === null` でも Hooks 本数一定 | `TermDetailPanel` 結合 | バブル／文字起こしから用語クリックで詳細が開き Hooks 警告が出ないか |
| #29 録音UX・ウィンドウ | 一時停止/再開、操作ドックUI、リセット確認、ウィンドウピッカー、ヘッダー掴みやすさ、フェーズボタンのアウトライン | **専用の自動テストは未追加**（手動を主） | 下記セクション 2 |

---

## 2. PR #29 — 手動テストチェックリスト

`bun run dev`（プレゼンシェル）で確認する。

### 2.1 録音（一時停止・再開）

- [ ] 録音開始後、**一時停止**で入力が止まり UI が状態表示を切り替える
- [ ] **再開**で録音が続き、文字起こしが再開する
- [ ] `fast` / `accurate` を切り替えた直後も、操作ドックから録音が期待どおり動く（#27 と合わせた回帰）

### 2.2 操作ドック（SystemControl）

- [ ] 録音 UI の刷新後も、**中断／一時停止／再開**の導線が誤解なく使える
- [ ] **すべてリセット**で確認ダイアログが出る／キャンセルでそのまま／確定でクリアされる

### 2.3 ウィンドウピッカー

- [ ] ヘッダーのウィンドウ管理ボタンから一覧・操作にアクセスできる
- [ ] レイアウトプリセット側の責務と重ならず、ウィンドウの追加・削除が破綻しない

### 2.4 レイアウトエンジン

- [ ] ウィンドウヘッダーの**ドラッグしやすさ**（視覚的ヒント）が分かる
- [ ] 既存のドラッグ＆ドロップでパネル移動が従来どおり動く

### 2.5 フェーズ遷移ボタン（compact）

- [ ] **アウトラインスタイル**に変更後も、発表終了／もどるが判別しやすい
- [ ] キーボードフォーカス（`focus-visible`）が極端に崩れていない

---

## 3. 自動テスト環境・ファイル一覧（PR #30）

| 種別 | パス | 内容 |
|------|------|------|
| 設定 | `bunfig.toml`, `test-setup.ts` | happy-dom の preload、`cleanup` |
| 単体 | `src/theme/__tests__/accentStyles.test.ts` | `accentRgba` / `micStartButtonStyle` 等 |
| 単体 | `src/presentation/hooks/__tests__/transcriptionModeSync.test.ts` | モードとサービス実装の対応 |
| 結合 | `src/presentation/hooks/__tests__/useTranscriptionModeBroadcast.test.tsx` | 複数 `useTranscription` のモード追従 |
| 結合 | `src/app/components/__tests__/TermDetailPanel.test.tsx` | Hooks 順序（`null` ⇄ 用語の `rerender`） |

`package.json` に `"test": "bun test"` が追加される。件数は **マージ後の `bun test` 出力**を正とする（参考: 取り込み検証時は 68 件すべて成功）。

### 3.1 テスト環境の注意

- `bunfig.toml` は **`cd Frontend` から `bun test`** で読み込まれる。ルートから実行する場合は `bun test --cwd Frontend` 等を検討。
- `@testing-library/react` の `screen` は happy-dom 登録タイミングで不整合になることがあるため、追加テストでは **`render()` の戻り値**でクエリする。

---

## 4. 自動テストケース一覧（PR #30 マージ済みリポジトリ向け）

### 4.1 単体 — `accentStyles.test.ts`（PR #26）

| # | テストケース | 期待結果 |
|---|----------------|----------|
| 1 | `accentRgba` | `rgba(r,g,b,a)` 形式 |
| 2 | `accentRgbSolid` | `rgb(r,g,b)` 形式 |
| 3 | `micStartButtonStyle` | 背景・文字色・ダーク/ライトで異なる `boxShadow` |
| 4 | `termChipStyle` | ダーク/ライトで背景アルファが異なる |
| 5 | `accentSliderStyle` | `accentColor` が `rgb(...)` |

### 4.2 単体 — `transcriptionModeSync.test.ts`（PR #27）

| # | テストケース | 期待結果 |
|---|----------------|----------|
| 1 | `fast` 時の `getTranscriptionService()` | `WebSpeechTranscriptionService` |
| 2 | `setTranscriptionMode('accurate')` 後 | `LocalSttTranscriptionService` |
| 3 | モード往復 | `fast` へ戻したとき同一シングルトン参照 |
| 4 | 同一モードへの `setTranscriptionMode` | 例外なく no-op |

### 4.3 結合 — `useTranscriptionModeBroadcast.test.tsx`（PR #27）

| # | テストケース | 期待結果 |
|---|----------------|----------|
| 1 | 同一ツリーに `ModeLabel` を 2 つ `render` し、`act` 内で `setTranscriptionMode` | 表示が `fast` → `accurate` → `fast` に追従 |

### 4.4 結合 — `TermDetailPanel.test.tsx`（PR #28）

| # | テストケース | 期待結果 |
|---|----------------|----------|
| 1 | `term === null` | プレースホルダ文言 |
| 2 | `term` あり | 見出し語・長文説明 |
| 3 | `null → term → null` の `rerender` | エラーなく切替 |

---

## 5. 自動テスト対象外（横断）

- レイアウトのアクセントグラデーション強度の見た目
- 録音ボタン配色（紫／緑）の見た目
- 実マイク・Web Speech / ローカル STT との E2E  

上記は `bun run dev` で手動（`test-spec-002.md` の方針に準拠）。

### 手動（#26〜#28 横断・任意）

- [ ] 設定で文字起こしモードを切替えたあと、操作ドックの録音が期待モードで動く
- [ ] バブル／文字起こしから用語を開き、`TermDetailPanel` がエラーなく表示される
- [ ] アクセント色変更後、チップ・スライダー等の色が追従する

---

## 6. 結果サマリー（手動・記録欄）

| 項目 | 記録欄 |
|------|--------|
| 実施日 | |
| 実施者 | |
| ブラウザ | |
| 結果 | 合格 / 不合格（メモ） |

---

## 7. 気づき・補足

- **モック重要語**は `test-spec-002.md` と `mockImportantTerms.test.ts` を参照。
- PR #29 の UI は変更頻度が高いため、**スナップショットよりセクション 2 のチェックリスト**を優先する。
- 追記は **本ファイル末尾に日付付きセクション**、または `test-spec-004.md` を新設（`AGENTS.md` の連番ルール）。
