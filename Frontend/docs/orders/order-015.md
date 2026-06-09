# order-015: 組み込みレイアウトプリセットのスナップショット化と初期状態

## 日付

2026-05-29

## 関連

- `order-014.md`（`PresentationSnapshot` 基盤）
- `test-spec-027.md`（本変更の検証）

## 指示要約

1. 組み込みプリセット **バブル重視 / ランキング重視 / フルカスタム** を、実機調整済みの `PresentationSnapshot` で上書きする。
2. 発中フェーズの **初回表示** をバブル重視プリセットと同内容にする。
3. 各プリセットの **外観（`appearance`）** を次のとおり固定する。

| プリセット | darkMode | themeColor | 設定 UI 上の色 |
|-----------|----------|------------|----------------|
| バブル重視 | OFF | `indigo` | 群青（左から2番目） |
| ランキング重視 | OFF | `emerald` | 緑 |
| フルカスタム | ON | `rose` | 赤 |

## 実装方針

| ファイル | 変更 |
|----------|------|
| `ScriptableLayoutTemplates.ts` | `*PresentationSnapshot()` を追加し、`template(name, layout, snapshot)` で登録 |
| `DuringPresentation/index.tsx` | レイアウト未設定時に `bubbleFocusedPresentationSnapshot` を `applyPresentationSnapshot` |
| `layoutUtils.ts` | `makeDefaultLayout()` がバブル重視の `layout` を返す |

## プリセット概要（レイアウト）

| 名前 | 構成 |
|------|------|
| バブル重視 | 文字起こし \| バブル +（説明 / 履歴） |
| ランキング重視 | （文字起こし + ランキング）\|（説明 / 履歴） |
| フルカスタム | 文字起こし \|（バブル+ランキング / 説明+履歴）、バブル自動切替 ON |

## 完了条件

- [x] 3 プリセット選択時にレイアウトと `appearance` 等が反映される
- [x] 初回起動時がバブル重視と同等（ライト + 群青）
- [x] `npm run build` 成功
