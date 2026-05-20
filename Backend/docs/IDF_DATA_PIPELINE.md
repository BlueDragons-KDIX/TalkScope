# Wikipedia（等）由来 IDF のデータフロー

用語スコアの **IDF バフ**は `IdfLookupTable`（`app/services/score_building_blocks.py`）で参照する。**キーは形態素の `base_form`（＝ API の `lemma`）と揃える**。

---

## 1. オフラインで作るもの（リポジトリ外でも可）

1. **コーパス**（例: Wikipedia 日本語ダンプ）から、語の文書頻度・総文書数を集計する。
2. 標準的な **IDF 式**（例: `log((N + 1) / (df + 1)) + 1`）で **語（見出し）→ スカラー** の表を作る。
3. **見出しを形態素の基本形に正規化**する（Sudachi/GiNZa と同じ辞書・分割方針に寄せるとヒット率が上がる）。
4. バッチまたはスクリプトで **関係 DB の `term_idf` に投入**する（またはオフライン用に JSON にしてインポータで流す）。

JSON オブジェクト `{ "語1": 2.34, ... }` は開発向け **`IDF_JSON_PATH`** と `load_idf_table_from_json` のみが利用するフォーマット（本番ソースは DB を優先）。

---

## 2. どこに保存するか（本番ソースは DB）

### ランタイム用テーブル `term_idf`

| カラム | 型 |
|--------|-----|
| `lemma` | 主キー（文字列。基本形） |
| `idf_value` | 実数 |

`ENABLE_DB_INIT=true` と `DATABASE_URL` があるとき、起動時 `create_all` でテーブルを作成できる。運用環境ではマイグレーション側で事前作成でもよい。

**ランタイム**では `main.py` の lifespan で **DB を先に初期化したあと** `init_idf_table()` が実行され、優先順位は次のとおりです。

1. **`term_idf` に少なくとも 1 行あれば**：起動時に読み込み、`IdfLookupTable` にして **プロセス内シングルトン**に載せる。環境変数 **`TERM_IDF_LOAD_MIN_VALUE`** を設定した場合は **`idf_value` がその値以上の行だけ**読み込み、語彙を間引ける（メモリ・ロード時間の削減用）。未設定は下限なし（実質全件）。
2. **読み込めない／0 行**のとき：環境変数 **`IDF_JSON_PATH`** の JSON があればそちら（ローカル・移行間のフォールバック）。
3. どちらも無効なら IDF は使わずスコアの他項目のみとする。

`POST /analysis/score/terms` は `get_idf_table()` の結果を渡す（`term_score` 内のサーバ固定係数 `_SCORE_IDF_WEIGHT > 0` のときのみ `idf_scaled`）。

### インポート例（概念）

バッチ側でファイルを読み、アプリとは別経路から `UPSERT` やバルクロードを実行する運用が一般的である（巨大語彙は `IMPORT INTO`／コピーステートメント等）。

---

## 3. 実行時にどう使われるか

1. クライアントが `POST /analysis/score/terms` に **`lemma`** を送る。
2. サーバが `idf_table.lookup(lemma)` を呼ぶ。
3. **テーブルにキーがあれば**その値にサーバ側の係数 `_SCORE_IDF_WEIGHT` を掛ける。
4. **無い語**は **`IdfLookupTable` の平均 IDF**（読み込んだ語のみで計算された平均）にフォールバックする。下限で間引いた場合、テーブル未収録語への平均は「残した語」の平均になる点に留意する。

---

## 4. 加工・運用上の注意

- **表記ゆれ**: **`lemma` でキーを揃える**。
- **`term_idf` を更新した場合**：現状プロセス再起動またはホットリロードまでメモリ上のシングルトンは変わらない（必要ならリロード用エンドポイントを別タスクで追加）。
- **未ログ語が多い**と平均フォールバックばかりになる → コーパス規模・正規化の見直し。

---

## 5. 関連コード

| 箇所 | 役割 |
|------|------|
| `TermIdf` | `term_idf` ORM |
| `IdfLookupTable` | 語→IDF と平均フォールバック |
| `load_idf_table_from_json` | JSON のみ（開発・フォールバック） |
| `init_idf_table` / `get_idf_table` | 起動時ロード・参照 |
| `compute_term_scores_for_request` | シングルトンを `compute_term_score_additive` に渡す |
| `compute_term_score_additive` | `idf_table` 非 `None` かつ `idf_weight > 0` のとき `idf_scaled` |
