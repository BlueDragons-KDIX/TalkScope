# テスト仕様書 003 — 2026-05-14 追加機能（アクセント・文字起こしモード・TermDetailPanel）

作成日: 2026-05-14  
テストランナー: Bun Test（`Frontend/bunfig.toml` の `preload` で happy-dom を登録）  
作業ブランチ: `test/spec-2026-05-14-transcription-accent-termdetail`

> **参照ドキュメント**: `Frontend/AGENTS.md`（テスト配置・`bun test`）、`AGENTS.md`（リポジトリ全体）

---

## 背景（本日の対象機能の整理）

`git log` 上、2026-05-14 に `develop/v0` へマージされた主な変更は次のとおりです。

| PR / 内容 | 概要 |
|-----------|------|
| #26 `feature/accent-color-theming` | アクセントテーマ、`accentStyles`、レイアウトの色味など |
| #27 `fix/transcription-recording-stale-service` | `useTranscription` のモードと `getTranscriptionService()` の同期 |
| #28 `fix/term-detail-panel-hooks-order` | `TermDetailPanel` の Rules of Hooks 違反修正 |

本仕様書では、上記のうち **自動テストで固定しやすい範囲** に絞って単体・結合テストを追加する。

---

## 結果サマリー（本書作成・実行時点）

| 項目 | 結果 |
|------|------|
| 総テスト数 | 68 |
| 合格 | 68 |
| 失敗 | 0 |
| テストファイル数 | 17 |
| 実行コマンド | `cd Frontend && bun test` |
| 備考 | `package.json` に `"test": "bun test"` を追加 |

---

## テスト環境（結合テスト用）

| 項目 | 内容 |
|------|------|
| DOM | `@happy-dom/global-registrator` を `Frontend/test-setup.ts` で preload 登録 |
| React 結合 | `@testing-library/react` の `render` / `act`（`screen` はグローバル `document` 束縛の都合で未使用） |
| 各テスト後 | `cleanup()` と `document.body.replaceChildren()` |

---

## 1. 単体 — `src/theme/__tests__/accentStyles.test.ts`（PR #26 関連）

**目的**: テーマ色を CSS に落とす純関数の出力を固定し、リグレッションを防ぐ。

| # | テストケース | 期待結果 | 結果 |
|---|----------------|----------|------|
| 1 | `accentRgba` | `rgba(r,g,b,a)` 形式 | ✅ |
| 2 | `accentRgbSolid` | `rgb(r,g,b)` 形式 | ✅ |
| 3 | `micStartButtonStyle` | 背景・文字色・ダーク/ライトで異なる boxShadow | ✅ |
| 4 | `termChipStyle` | ダーク/ライトで背景アルファが異なる | ✅ |
| 5 | `accentSliderStyle` | `accentColor` が `rgb(...)` | ✅ |

---

## 2. 単体 — `src/presentation/hooks/__tests__/transcriptionModeSync.test.ts`（PR #27）

**目的**: グローバルな文字起こしモードとサービス実装の対応が一貫していることを検証する。

| # | テストケース | 期待結果 | 結果 |
|---|----------------|----------|------|
| 1 | `fast` 時の `getTranscriptionService()` | `WebSpeechTranscriptionService` インスタンス | ✅ |
| 2 | `setTranscriptionMode('accurate')` 後 | `LocalSttTranscriptionService` インスタンス | ✅ |
| 3 | モード往復 | `fast` へ戻したとき同一シングルトン参照 | ✅ |
| 4 | 同一モードへの `setTranscriptionMode` | 例外なく no-op | ✅ |

---

## 3. 結合 — `src/presentation/hooks/__tests__/useTranscriptionModeBroadcast.test.tsx`（PR #27）

**目的**: `useSyncExternalStore` によるモード購読が、**同一ツリー内の複数フック利用者**に一斉に反映されることを検証する。

| # | テストケース | 期待結果 | 結果 |
|---|----------------|----------|------|
| 1 | 2 つの `ModeLabel` を `render` 後、`setTranscriptionMode` を `act` 内で実行 | 両方の表示が `fast` → `accurate` → `fast` に追従 | ✅ |

---

## 4. 結合 — `src/app/components/__tests__/TermDetailPanel.test.tsx`（PR #28）

**目的**: `term` の有無で早期 return しても **フック本数が変わらない** 修正が効いていることを、`null` ⇄ 用語の **同一ルート `rerender`** で検証する。

| # | テストケース | 期待結果 | 結果 |
|---|----------------|----------|------|
| 1 | `term === null` | プレースホルダ文言が表示される | ✅ |
| 2 | `term` あり | 見出し語・長文説明が表示される | ✅ |
| 3 | `null → term → null` の `rerender` | エラーなく表示が切り替わる | ✅ |

---

## 自動テスト対象外（変更なし）

- レイアウトエンジンの視覚的なアクセントグラデーション強度
- 録音ボタン配色（紫／緑）の見た目
- 実マイク・Web Speech / ローカル STT サーバーとの E2E

上記は `bun run dev` による手動確認とする（`test-spec-002.md` の方針に準拠）。

---

## 手動確認チェックリスト（任意）

- [ ] 設定で文字起こしモードを切替えたあと、操作ドックの録音が期待モードで動く
- [ ] バブル／文字起こしから用語を開き、`TermDetailPanel` がエラーなく表示される
- [ ] アクセント色変更後、チップ・スライダー等の色が追従する

---

## 気づき・注意点

- `Frontend` 直下の `bunfig.toml` は **`cd Frontend` から `bun test` を実行したとき**に読み込まれる。リポジトリルートからテストする場合は `bun test --cwd Frontend` 等の運用を検討する。
- `@testing-library/react` の `screen` は、happy-dom 登録タイミングによりグローバル `document` と不整合になることがあるため、本追加テストでは **`render()` の戻り値**でクエリする。
