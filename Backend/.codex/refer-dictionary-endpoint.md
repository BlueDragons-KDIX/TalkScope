# refer_dictionary_endpoint 開発方針

## 対象

当面の Backend 改修は、基本的に `refer_dictionary_endpoint` に関する部分を中心に進めます。

主な対象ファイル:

- `app/api/endpoints/analysis.py`
- `app/services/refer_dictionary.py`
- `app/schemas/analysis.py`
- `tests/test_refer_dictionary_endpoint.py`
- 必要に応じて `tests/integration/test_refer_dictionary_*.py`

## 方針

- endpoint は薄く保ち、リクエスト受け取りとレスポンス整形を中心にする
- 名詞抽出、DB 参照、LLM フォールバック、ベクトル生成などの処理は service 側に寄せる
- 既存の API パスとレスポンス形は、明示的な仕様変更がない限り維持する
- 変更時は 200 / 422 / 想定エラーのテストを確認する

## 注意

- 辞書管理 API など、`refer_dictionary_endpoint` 以外の既存機能は必要最小限だけ触る
- 大きな責務移動をする場合は、先にこのドキュメントへ方針を追記する
- DB 未設定でも解析系 API が落ちないことを重視する
