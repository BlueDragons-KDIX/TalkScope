# AGENTS.md

このファイルは、このリポジトリで開発するメンバー/エージェント向けの共通ガイドです。

## 目的

LexiFlow は、会話を文字起こしし、文脈上重要な語や専門語を抽出・強調して、
意味確認を素早く行えるようにする会話理解支援アプリです。

## リポジトリ構成と責務

- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Frontend`: React フロントエンド
- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend`: FastAPI バックエンド
- `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/test`: 解析ロジック試作・検証

## ドキュメント運用ルール

- ルートの `README.md` はハッカソン提出テンプレート形式を維持する
- 技術的な詳細は以下に記載する
  - Frontend 詳細: `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Frontend/README.md`
  - Backend 詳細: `/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend/README.md`
  - 開発上の全体方針: 本 `AGENTS.md`

## 開発時の基本コマンド

### Frontend

```bash
cd Frontend
bun install
bun run dev
```

### Backend

```bash
cd Backend
uv sync
uv run uvicorn main:app --reload
```

## 実装方針（初期）

- Frontend は UX と素早い検証を優先
- Backend は解析ロジックを API として差し替えやすく設計
- NLP は段階導入（ルールベース → 形態素解析/係り受け → 類似度モデル）

## MVP 優先順

1. 音声入力から単語抽出までの一連動作を安定化
2. 重要語スコアの基準を明確化
3. 単語タップ時の意味検索導線を統一
4. Frontend/Backend の API 接続を固定化

## 注意事項

- 音声認識はブラウザ依存のため、Chrome 系ブラウザでの検証を優先する
- 仕様が変わった場合は、まず `README.md`（提出向け）と各層 README（開発向け）を同期更新する
