# FastAPI 開発ガイド（このプロジェクト向け）

このドキュメントは、LexiFlow の Backend を実装・改修する際のガイドです。  
方針は「小規模でシンプルに保ちつつ、後から拡張しやすくする」です。

## 1. 基本方針

- まずは過剰分割しない（必要になってから分割する）
- ルーターとスキーマを明確に分ける
- 外部公開するエンドポイントの処理は `services` に寄せ、`endpoints` は薄く保つ
- すべての公開 API に `response_model` を付ける
- 例外は `HTTPException` か共通例外ハンドラで返し、レスポンス形式を揃える

## 1.1 依存管理（uv）

- Python 依存管理は `uv` を使用する
- 依存定義は `pyproject.toml` を正とする
- 開発開始時は `uv sync` を実行する
- 実行は `uv run ...` を使う（例: `uv run uvicorn main:app --reload`）

## 2. 推奨ディレクトリ構成（現段階）

```txt
Backend/
├── main.py
├── requirements.txt
└── app/
    ├── api/
    │   ├── __init__.py
    │   └── endpoints/
    │       ├── hoge.py
    │       └── ...
    ├── services/
    │   ├── hoge.py
    │   └── ...
    └── schemas/
        ├── hoge.py
        └── ...
```

### 拡張時の目安

- エンドポイントが 7 個以上になって肥大化したら、機能単位（例: `analysis`, `glossary`, `health`）でファイルを分割
- DB 導入時に `repositories/` または `models/` を追加
- `services/` が肥大化したら、機能単位（例: `analysis_service.py`, `glossary_service.py`）で分割

## 3. ルーティング規約

- `main.py` はアプリ生成と `include_router` のみを担当
- `app/api/__init__.py` でルーターを集約する
- エンドポイントは `app/api/endpoints/*.py` に配置

例:

```python
# app/api/endpoints/analysis.py
import fastapi
from app.schemas.analysis import AnalyzeRequest, AnalyzeResponse

router = fastapi.APIRouter()

@router.post("/", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest):
    ...
```

```python
# app/api/__init__.py
from app.api.endpoints import analysis

router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
```

## 4. `async` / `def` の使い分け

- I/O 待ち中心（外部 API 呼び出しなど）: `async def`
- 同期ライブラリ・CPU 寄り処理: `def`
- `async def` 内で重い同期処理を直接回さない

## 5. スキーマ（Pydantic）規約

- リクエストとレスポンスの型を分ける
- バリデーション（`Field` の `min_length`, `ge` など）を活用する
- 返却 JSON の形を `response_model` で固定する

例:

```python
from pydantic import BaseModel, Field

class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1)

class AnalyzeResponse(BaseModel):
    keywords: list[str]
```

## 6. エラーハンドリング

- 想定エラーは `HTTPException(status_code=..., detail=...)` を返す
- 内部エラーはログに残し、クライアントには過度な内部情報を返さない

## 7. API ドキュメント

- `tags`、`response_model`、`status_code` を明示して `/docs` を見やすく保つ
- ハッカソン期間中は `/docs` を有効で問題なし

## 8. テスト方針（最小）

- まずは主要 API の疎通テストから開始
- 優先対象:
  - 正常系（200）
  - 入力不正（422）
  - 想定エラー（4xx/5xx）

## 9. このプロジェクトで避けること（現段階）

- 早期に Celery・マイクロサービス化などを導入しない
- DB 未導入段階で ORM 層を作り込みすぎない
- 「将来のため」に抽象化を増やしすぎない

## 10. 変更時チェックリスト

- 追加したエンドポイントは `app/api/__init__.py` に登録したか
- `response_model` を設定したか
- 422 を含む入力バリデーションを確認したか
- `Backend/README.md` の API 一覧を更新したか
