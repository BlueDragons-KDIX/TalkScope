# Frontend

LexiFlow のフロントエンドです。音声認識、文字起こし表示、単語バブル UI、履歴管理を担当します。

## 技術スタック

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- Bun

## セットアップ

```bash
cd Frontend
bun install
bun run dev
```

- 開発サーバー: `http://localhost:5173`
- 推奨ブラウザ: Chrome 系（Web Speech API 利用のため）

## Docker で起動

ルートディレクトリ（`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026`）で実行してください。

```bash
make up-frontend
```

初回や Dockerfile 更新後に再ビルドしたい場合:

```bash
make up-frontend-build
```

Docker の build cache が溜まって容量不足になった場合:

```bash
make docker-clean
```

- URL: `http://localhost:5173`
- HTTPS 開発サーバーが必要な場合は `VITE_USE_HTTPS=true` を設定

## 現在の主要機能

- 音声認識（`ja-JP`）とリアルタイム文字起こし
- 文字起こしテキストからの用語抽出
- 用語のバブル表示・詳細表示
- 検索履歴管理（`localStorage`）
- 単語管理モーダル（一覧/編集/削除/一括登録）
- 複数レイアウトプリセット切り替え

## ディレクトリ概要

```txt
Frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── hooks/useSpeechRecognition.ts
│   │   ├── utils/termDetection.ts
│   │   ├── components/
│   │   └── layout/
│   ├── styles/
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## 類似度の検証

バブルサイズに使う「主題・会話との類似度」が正しく算出されているか確認する方法です。

### 1. 検証スクリプトで確認（推奨）

```bash
cd Frontend
bun run verify:similarity
```

- 用語ごとの主題・会話との類似度（-1〜1）とスコア（0〜1）を表示します。
- 範囲外の値や同一用語で結果がぶれないかをチェックします。

### 2. ブラウザの開発者ツールで確認

1. `bun run dev` でアプリを起動し、文字起こしで用語を出した状態にします。
2. F12 で開発者ツールを開き、**Console** タブを開きます。
3. `[BubbleCloud] 類似度(モック) …` のログを確認します。
   - **themeScore** … 主題との類似度を 0〜1 にした値（高いほど主題に近い）
   - **convScore** … 会話との類似度を 0〜1 にした値（高いほど会話に近い）
   - **radius** … 上記から計算したバブル半径（類似度が高いほど大きくなっているか確認）

### 3. 本番 API を使う場合

バックエンドのベクトル API（例: `POST /analysis/vectorize`）に切り替えたあとは、同じコンソールログで `themeScore` / `convScore` の値が主題・会話の内容に応じて変わるかを確認してください。モックと違って「意味的に近い用語ほどスコアが高く」なれば正しく動作しています。

## 開発メモ

- 用語抽出は現在フロント側のロジックで実施
- 今後は Backend の解析 API と接続し、抽出精度・スコア計算を強化予定
- UI 検証の速度を優先するため、ログインなしで利用できる設計
