# プロダクト名

LexiFlow（仮）

![LexiFlow](https://kc3.me/cms/wp-content/uploads/2026/02/444e7120d5cdd74aa75f7a94bf8821a5-scaled.png)

## チーム名

チーム○ XXXX（仮）

## 背景・課題・解決されること

専門性の高い会話では、以下の課題が起きやすいです。

- 音声そのものが聞き取りづらい
- 聞き取れても、専門用語の意味がすぐに分からない
- 重要語を見失い、会話の流れについていけなくなる

本プロダクトは、音声を文字起こししつつ文脈上重要な単語を抽出・強調し、
ワンタップで意味確認できる導線を提供することで、難しい会話への追従を支援します。

## プロダクト説明

LexiFlow は、会話理解を補助する Web アプリケーションです。

- 音声認識で会話を文字起こし
- テキストを単語単位で分割
- 重要語や専門性の高い語を抽出し、スコアリングして強調表示
- 単語タップで意味検索しやすい UI を提供

構成は以下です。

- Frontend（React）: 音声認識、テキスト表示、バブル UI、履歴管理（`localStorage`）
- Backend（Python）: 形態素解析、係り受け解析、類似度計算（`word2vec` 予定）などの重い解析

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

### 基本操作

- 録音開始で文字起こしを開始
- 抽出された単語バブルをタップして詳細を確認
- 履歴から過去に確認した単語へ再アクセス

[デモ動画はこちら](https://www.youtube.com/watch?v=fbzGp0XJGq8)

## 注力したポイント

### アイデア面

- 会話理解で実際に詰まりやすい「聞き取り」「難語理解」「重要語把握」を1つの導線に統合
- 「単語抽出だけ」で終わらず、意味確認まで最短で到達できる操作設計

### デザイン面

- 会話中でも視線移動を抑えられるバブル中心 UI
- 重要語の強調と詳細表示を分離し、情報過多を避ける構成

### その他

- Frontend と Backend を責務分離し、段階的に NLP 精度を上げられる構成
- ログイン不要で試せるようにし、ハッカソン検証の初速を重視

## 使用技術

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4, Bun
- Backend: Python, FastAPI, Uvicorn, Pydantic
- Browser API: Web Speech API
- Data/Storage: localStorage（フロント履歴保存）
