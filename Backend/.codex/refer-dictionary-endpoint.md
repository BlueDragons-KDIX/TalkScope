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

- 既存の辞書管理 API や他のエンドポイントは、明示的な必要がある場合だけ触る
- endpoint は薄く保ち、リクエスト受け取りとレスポンス整形を中心にする
- 名詞抽出、DB 参照、LLM フォールバック、ベクトル生成などの処理は service 側に寄せる
- 既存の API パスとレスポンス形は、明示的な仕様変更がない限り維持する
- 変更時は 200 / 422 / 想定エラーのテストを確認する

## 注意

- 辞書管理 API など、`refer_dictionary_endpoint` 以外の既存機能は必要最小限だけ触る
- 大きな責務移動をする場合は、先にこのドキュメントへ方針を追記する
- DB 未設定でも解析系 API が落ちないことを重視する


## 改修内容

形態素解析後をメインに改修を行う。
リアルタイム性の向上や精度向上を目指す。
また、入力と出力も変化するため、スコア計算など追加要素に備える。

### 現在の作業状況

現在は `app/services/refer_dictionary_v1.py` で、次期実装の流れを試作している段階。
まだ既存 endpoint から実行する前提ではなく、既存の `app/services/refer_dictionary.py` の動作を壊さない範囲で進める。

2026-05-17 時点では、SSE 対応そのものより先に、`refer_dictionary_v1.refer_dictionary()` を通して非同期処理の特徴を学びながら整理する方針。
`service_analyze_text()` は未完成のまま残し、まずは `refer_dictionary()` 単体を async generator として手動実行できる状態にする。
そのため、pytest ではなく `Backend/scripts/test_refer_dictionary_v1.py` を簡易動作環境として用意している。

直近で進めていた内容:

1. `_extract_search_targets()` で抽出した複合語タプルを `set` で dedup する
2. 複合語タプルを文字列へ連結し、`WHERE term IN (...)` 相当の ORM クエリで DB を一括検索する
3. DB hit 分を `TermInfo` に変換し、後続の意味選択・返却処理につなげる準備をする
4. `refer_dictionary()` の `async for` / `yield` の流れを、簡易スクリプトで観察できるようにする

現時点では発話順の維持は優先しない。
また、MVP では 1 単語に対して複数意味を生成しない。複数 sense の生成・意味ごとの embedding・文脈に応じた best sense 選択は、必要になってから拡張する。

### 非同期学習メモ

`refer_dictionary_v1.refer_dictionary()` は `async def` の中で `yield` しているため、async generator として扱う。
呼び出し側は `await refer_dictionary(text)` ではなく、`async for entries in refer_dictionary(text):` で chunk を受け取る。

現状の `yield` 単位は以下の想定。

1. DB hit 分の `list[DictionaryEntry]`
2. DB miss 後に LLM / embedding / DB 保存を経由した `list[DictionaryEntry]`

この構造を観察するための最小スクリプト:

```bash
cd Backend
uv run python -m scripts.test_refer_dictionary_v1
```

注意点として、`refer_dictionary()` 自体は async generator だが、内部の DB 検索、LLM 呼び出し、embedding、DB 保存はまだ同期関数を直接呼んでいる。
そのため、現時点の async は「分割して返す形を学ぶための入口」であり、イベントループをブロックしない実装にするには、後で `asyncio.to_thread(...)` などによる調整が必要。

SSE 化する段階では、`service_analyze_text()` を async generator として実装し、`refer_dictionary()` から受け取った chunk を `data: ...\n\n` 形式へ整形して `StreamingResponse` に渡す。

### 問題点

1. 単語の重複を排除していない
2. DBの検索を並列で行っている
3. LLMの問い合わせ回数が多い
4. 同義語に弱い
5. LLM、DBの書き込みを同期している

### 対策

1. 単語の重複はdedup（list(set())）で排除する
2. DBの検索はバッチ化する（WHERE IN構文）
3. プロンプトの工夫
  - 例：
    ```
        以下の単語それぞれについて、主要な意味を最大3つ出してください。
        各単語ごとに独立して答えてください。

        単語:
        - AI
        - モデル
        - バグ

        出力形式(JSON):
        {
        "AI": [...],
        "モデル": [...],
        "バグ": [...]
        }
    ```
4. 単語ではなく意味に対してエンベディングを行う。それぞれのベクトルの中で、入力テキストと近いベクトルの意味を返す
5. LLM、DBはまとまりを持ちつつ非同期で処理し、スコア計算が終わった単語から返却していく

### エンベディング対象の変更メモ

既存の `refer_dictionary.py` では、抽出した単語そのものを `vectorize_pretokenized_words()` でエンベディングしていた。
つまり、`("自然", "言語", "処理")` のような形態素解析済みの単語タプルを受け取り、各形態素ベクトルの平均を単語ベクトルとして扱っていた。

一方、現在試作中の `refer_dictionary_v1.py` では、単語そのものではなく、LLM が生成した「単語の意味のテキスト」をエンベディング対象にしている。
そのため、意味テキストをもう一度 `vectorize_sentence()` 側で解析し、内部で形態素解析された各内容語ベクトルの平均値を使って、意味説明文のベクトルを作っている。

この変更により、DB に保存・比較するベクトルは「単語表記の近さ」ではなく「意味説明文としての近さ」を表す方向に寄る。
今後の best sense selection やスコア計算では、この前提を意識する。

---

「バッチ処理」と「独立性」の両立：
LLMへのリクエスト時は複数単語をまとめて入力して効率化を図る一方で、各単語が互いの文脈に影響されないよう「単語ごとに独立した意味」を出力させる制約を設けています。

同期から非同期への移行前提：
LLMはシステム内で「最も重い」処理と定義されており、現在は同期処理ですが、将来的にレスポンスの遅延を防ぐため、LLMを介さないDBヒット分を先に返し、生成が必要なものは後から反映させる「非同期化」を前提としています。

出力フォーマットの厳格な制御：
外部からのレスポンスをそのままシステムで利用できるよう、1単語あたり「最大3件」「JSON形式」「短文定義」という具体的な制約を課し、出力の正規化とノイズ削減を徹底しています。

### 理想像

処理フローメモ

1. 名詞抽出
2. dedup
3. DB一括取得
ここから並列
4. missのみ対象
5. 各単語ごとにLLM（ただしバッチ化はする）

6. sense生成（max 3） ※ 複数の意味生成はMVPに反するためしない。余裕ができてから拡張する
7. embedding（事前計算）
8. DB保存

9. 文embedding
10. 各termでbest sense選択

11. スコア計算
12. 返却

DBにhitしたものは、missを待たずして、スコアを計算し返却する。遅れて、missした単語を返す

### 今後の動きについて整理 

今後の動きについてです。進捗に応じて次の数字を更新します
現在は"1"の最中です。

1. リファクタリング
2. 総合テストツール、速度測定
3. DB検索のバッチ化、重複への対応
4. フローの整理（スコア計算の導入準備とレスポンスの見直し）
5. 形態素解析＿複合語への対応
6. spaCyからエンベディングへ移行
7. 単語ベースのベクトル計算から意味ベースのベクトル計算へ移行
8. DB設計の見直し
9. LLMプロンプトの調整
10. 書き込みタイミングを考える
- 現在のLLM→書き込み→完了→スコアだと、LLMの遅延の影響が出る
- 書き込みはバッチでしたい

## テストについて
テストの目的として、実行時エラーがないかの確認やパフォーマンス改善の指標として用います

### test_refer_dictionary_benchmark
test_refer_dictionary_benchmarkは、3つの指標でテストを行っています。
- すべてが初出で構成されるテキスト
- 初出と既出が混合しているテキスト
- すべてが既出で構成されるテキスト

これらのテストケースで、改修による性能改善を確認します。
以下のコマンドでテストを実行し、ログを収集しています。
```
uv run python -m pytest tests/integration/test_refer_dictionary_benchmark.py -s -v -rA --tb=long -m integration > ".log/$(date '+%Y%m%d_%H%M%S').txt"
```
しかし、LLM(GeminiAPI)へのリクエストが含まれており、GeminiAPIのコンディションによってエラーを返すことが確認されています。また、利用枠の制限もあります。(詳しくは`.codex/gemini_limit.md`)
そのため、ほとんどのテストではLLMリクエストを含まない他のテストコードでテストを実施することを推奨します。
