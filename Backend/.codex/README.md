# Backend .codex

このディレクトリは、Backend 開発の補足ドキュメント置き場です。

`Backend/AGENTS.md` は人間が読みやすい入口として保ち、実装方針・調査メモ・機能単位の判断材料は必要に応じてこの配下へ増やします。

## 指示ファイルについて

`.codex/instructions.md` を参照すること

## 現在の主な対象

ここは現在作業として注目している箇所について記載しています。状況に応じて随時変更すること。

- `refer_dictionary_v1.py` での次期 refer_dictionary 処理フロー試作
- 複合語タプルの dedup と DB 一括検索（`WHERE term IN (...)`）の導入準備
- DB hit 結果を `TermInfo` に変換し、意味選択ロジックへ接続するための整理
- 既存 API 仕様を壊さない範囲での段階的な修正

## ドキュメント一覧

- `refer-dictionary-endpoint.md`
  - `refer_dictionary_endpoint` 周辺を変更するときの方針

## 運用ルール

- 大きな設計判断をしたら、この配下に短いメモを残す
- 実装手順だけでなく、なぜその方針にしたかも書く
- `AGENTS.md` には入口だけを置き、詳細化しすぎない
