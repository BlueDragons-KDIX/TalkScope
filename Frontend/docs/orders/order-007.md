# order-007: ウィンドウ表示名の変更

## 日付

2026-05-29

## 参加者

- ユーザー（担当者）
- Codex

---

## 指示要約

プレゼン画面のウィンドウヘッダー・ウィンドウ選択・設定ポップアップに表示される名称を、次のとおり変更する（ウィンドウ ID は変更しない）。

| ウィンドウ ID | 旧表示名 | 新表示名 |
|---|---|---|
| `bubbleCloud` | 用語マップ | バブル |
| `importanceRanking` | 重要度 | ランキング |
| `detail` | 詳細 | 説明 |
| `history` | 履歴 | クリック履歴 |

---

## 実装方針

1. **`registerAllWindows` の `label` を更新**
   - `Frontend/src/presentation/windows/index.ts` の 4 件を上表どおり変更する。
   - ヘッダー・`WindowPickerButton`・設定パネルタイトル（`{label} の設定`）はレジストリの `label` を参照するため、ここだけで UI 表示名が一括で変わる。

2. **レガシー `app/layout` の同期（任意だが実施）**
   - `app/layout/LayoutEngine.tsx` の `PANEL_LABELS` と `layoutUtils.ts` のレイアウトコメントを同じ名称に揃える。

3. **ドメイン用語との区別**
   - 「重要度」は `term.score` やランキングアルゴリズムの説明として引き続き使う（ADR-009 等は変更しない）。
   - 本変更は **ウィンドウ chrome の表示名のみ** を対象とする。

---

## 完了条件

- 上記 4 ウィンドウのヘッダー・ウィンドウ選択・設定ポップアップに新名称が表示されること
- ウィンドウ ID・レイアウト JSON・ストアキーは従来どおりであること
- `npm run build` が成功すること
