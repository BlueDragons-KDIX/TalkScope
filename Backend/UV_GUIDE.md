# uv 運用ガイド（Backend）

このドキュメントは、`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend` での
Python パッケージ管理を `uv` で行うための手順をまとめたものです。

## 前提

- `uv` がインストール済みであること
- 依存定義は `pyproject.toml` を正とする
- ロックファイルは `uv.lock` を使用する

## 初回セットアップ

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv sync
```

- `.venv` が自動作成されます
- `uv.lock` に基づいて依存が同期されます

## アプリ起動

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv run uvicorn main:app --reload
```

## よく使うコマンド

### 依存を追加

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv add <package-name>
```

例:

```bash
uv add numpy
```

### 開発依存を追加

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv add --dev <package-name>
```

例:

```bash
uv add --dev pytest
```

### 依存を削除

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv remove <package-name>
```

### ロックファイル更新

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv lock
```

### 環境を再同期

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv sync
```

## テスト実行（例）

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv run pytest
```

## トラブルシュート

### 依存が壊れた/入れ直したい

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
rm -rf .venv
uv sync
```

### ロックファイルと環境のずれを解消したい

```bash
cd /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend
uv lock
uv sync
```

## 運用ルール

- 新規依存は `uv add` / `uv add --dev` で追加する
- `pip install` で直接入れない
- 依存変更時は `pyproject.toml` と `uv.lock` を必ずコミットする
- `requirements.txt` は互換目的で残置（更新の正本は `pyproject.toml`）

