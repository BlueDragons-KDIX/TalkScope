# プロダクト名

TalkScope

![Uploading スクリーンショット 2026-02-22 12.29.49.png…]()



## チーム名

チーム19 ブルードラゴンズ

## 背景・課題・解決されること

専門性の高い会話では、以下の課題が起きやすい。

- 音声そのものが聞き取りづらい。
- 専門用語の意味がすぐに分からない。
- 重要語を見失い、会話の流れについていけなくなる。

本プロダクトは、音声を文字起こししつつ文脈上重要な単語を抽出・強調し、
ワンタップで意味を確認できる導線を提供することで、難しい会話の理解を支援します。

## プロダクト説明

TalkScope は、会話理解を補助する Web アプリケーションです。

- 音声認識で会話を文字起こし
- テキストを単語単位で分析
- 重要語や専門性の高い語を抽出し、スコアリングして強調表示
- 単語タップで意味検索しやすい UI を提供

構成は以下です。

- Frontend（React）: 音声認識、テキスト表示、バブル UI、履歴管理（`indexDB`）
- Backend（Python）: 形態素解析、係り受け解析、類似度計算（`word2vec`）などの重めの解析。

## 操作説明・デモ動画

### ローカル実行手順

1. Frontend を起動

```bash
cd Frontend
bun install
bun run dev
```

2. Backend を起動

```bash
cd Backend
uv sync
uv run uvicorn main:app --reload
```

3. `http://localhost:5173` にアクセスして利用

### Docker 実行手順

ルートディレクトリ（`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026`）で実行します。
`Backend` はデフォルトで `linux/amd64` で起動し、依存 wheel を優先利用します（ARM Mac でも起動可能）。
ネイティブ実行したい場合は `BACKEND_PLATFORM=linux/arm64` などを指定してください。

1. Frontend + Backend を同時起動

```bash
make up
```

初回や Dockerfile 更新後に再ビルドしたい場合:

```bash
make up-build
```

2. Frontend のみ起動

```bash
make up-frontend
```

3. Backend のみ起動

```bash
make up-backend
```

4. 停止

```bash
make down
```

Docker の build cache が溜まって容量不足になった場合:

```bash
make docker-clean
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 基本操作

- 録音開始で文字起こしを開始
- 抽出された単語の強調表示やバブルをタップして意味を確認
- ピンをつけて単語を保存
- 履歴から過去に確認した単語へ再アクセス
- ホバーで簡単な説明、左クリックで詳細説明、右クリックでピン


## 注力したポイント

### アイデア面

- 会話理解で実際に詰まりやすい「聞き取り」「内容の理解」「重要語の把握」を1つの導線に統合
- 従来の議事録アプリとは異なり、文字起こしや抽出だけで終わらず、意味確認まで最短で到達できる操作設計
- 操作をホバー、ワンクリックなどで完結させる

### デザイン面

#### バブルについて
- 会話中でも操作しやすく視線移動が抑えられるバブル中心のUI
- 会話の中での重要度に応じて大きさが変わるため、初心者でも何を理解すればいいかわかりやすい
- ピン留めしたバブルは後でも見返せるように表形式で一覧表示
- スライダーでバブルの倍率をユーザー自身が変更可能で、枠の大きさを変えると自動で倍率が調整される
- マウスだけで直感的に操作ができる
    - ホバーで簡単な説明、左クリックで詳細説明、右クリックでピン

#### 文字起こしについて
- 文字起こしの中でハイライトを表示し
- 重要語のハイライトと詳細表示を分離し、情報過多を避ける構成
- バブルと操作を統一
    - ホバーで簡単な説明、左クリックで詳細説明、右クリックでピン

#### その他こだわったデザイン
- レイアウトはユーザーが自身で変更可能で、いらないウィンドウは削除できる
- バブルやハイライトをホバーした時の表示を枠の外にはみ出ないように表示位置を自動で調整する

### その他

- Frontend と Backend を責務分離し、段階的に NLP 精度(自然言語処理)を上げられる構成
- 使い勝手を重要視しログイン不要で試せるようにした

## 使用技術

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4, Bun
- Backend: Python, uv, FastAPI, Uvicorn, Pydantic
- Browser API: Web Speech API
- Data/Storage: localStorage
