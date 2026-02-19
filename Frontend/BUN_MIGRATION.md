# Bun移行ガイド（LexiFlow Frontend）

このドキュメントは、`Frontend` の依存管理を `npm` から `Bun` に移行した手順をまとめたものです。

## 目的

- パッケージ管理を Bun に統一する
- 脆弱性監査を通る依存ツリーへ更新する
- 今後の開発手順をシンプルにする

## 移行後の状態

- パッケージマネージャ: `bun@1.3.9`
- ロックファイル: `bun.lock`
- 削除済み: `package-lock.json`
- 脆弱性監査: `bun audit` で `No vulnerabilities found`

## 変更ファイル

- `Frontend/package.json`
- `Frontend/bun.lock`（新規）
- `Frontend/package-lock.json`（削除）
- `Frontend/doc.md`（運用コマンド更新）

## 実施手順

1. Bunをインストール

```bash
curl -fsSL https://bun.sh/install | bash
exec /bin/zsh
```

2. `package.json` に Bun 管理を明記

```json
{
  "packageManager": "bun@1.3.9"
}
```

3. 脆弱性のある間接依存を `overrides` で固定

```json
{
  "overrides": {
    "minimatch": "^10.2.1",
    "ajv": "^8.18.0"
  }
}
```

4. Bunで依存を解決してロックファイルを作成

```bash
cd Frontend
bun install
```

5. npmロックファイルを削除

```bash
rm -f package-lock.json
```

6. 監査実行

```bash
bun audit
```

## 日常運用コマンド

```bash
cd Frontend
bun install
bun run dev
bun run build
bun run lint
bun audit
```

## なぜ脆弱性が出ていたか

主因はアプリ本体ではなく、`eslint` 系の間接依存です。

- `minimatch < 10.2.1`（high, ReDoS）
- `ajv < 8.18.0`（moderate, ReDoS）

`overrides` で安全なバージョンに固定し、Bunロックを再生成することで解消しました。
