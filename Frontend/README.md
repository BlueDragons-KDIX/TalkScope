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

## 現在の主要機能

- 音声認識（`ja-JP`）とリアルタイム文字起こし
- 文字起こしテキストからの用語抽出
- 用語のバブル表示・詳細表示
- 検索履歴管理（`localStorage`）
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

## 開発メモ

- 用語抽出は現在フロント側のロジックで実施
- 今後は Backend の解析 API と接続し、抽出精度・スコア計算を強化予定
- UI 検証の速度を優先するため、ログインなしで利用できる設計
