# Backend

FastAPI を使用したバックエンドサーバーです。

## セットアップ

### 1. 仮想環境の作成・有効化

```bash
# 仮想環境の作成（初回のみ）
python -m venv venv

# 有効化
source venv/bin/activate
```

### 2. パッケージのインストール

```bash
pip install -r requirements.txt
```

## サーバーの起動

```bash
uvicorn main:app --reload
```

- デフォルトで `http://127.0.0.1:8000` で起動します
- `--reload` を付けるとコード変更時に自動リロードされます

## API ドキュメント

サーバー起動後、以下の URL で自動生成されたドキュメントを確認できます。

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## ディレクトリ構成

```
Backend/
├── main.py                      # アプリのエントリーポイント
├── requirements.txt
├── venv/
└── app/
    ├── api/
    │   ├── __init__.py          # ルーターの集約（ここで全エンドポイントを登録）
    │   └── endpoints/
    │       ├── __init__.py
    │       └── hoge.py          # 各エンドポイントの実装
    └── schemas/
        ├── __init__.py
        └── hoge.py              # リクエスト/レスポンスのスキーマ定義
```

## ルーティングの仕組み

リクエストは以下の流れでルーティングされます。

```
main.py  →  app/api/__init__.py  →  app/api/endpoints/各ファイル
```

| ファイル                 | 役割                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `main.py`                | FastAPI アプリの作成と `app.include_router(router)` でルーターを登録 |
| `app/api/__init__.py`    | 各エンドポイントの `router` を集約する中継地点                       |
| `app/api/endpoints/*.py` | 個別のエンドポイント実装（`router = fastapi.APIRouter()` を定義）    |
| `app/schemas/*.py`       | リクエスト/レスポンスの型定義（Pydantic モデル）                     |

## エンドポイントの追加方法

例として `fuga` エンドポイントを追加する場合：

### 1. エンドポイントファイルを作成

`app/api/endpoints/fuga.py` を作成し、`router` を定義します。

```python
import fastapi

router = fastapi.APIRouter()

@router.get("/")
def read_fuga():
    return {"Hello": "Fuga"}
```

### 2. ルーターを登録

`app/api/__init__.py` にインポートと `include_router` を追加します。

```python
from app.api.endpoints import hoge, fuga  # fuga を追加

router.include_router(hoge.router, prefix="/hoge", tags=["hoge"])
router.include_router(fuga.router, prefix="/fuga", tags=["fuga"])  # 追加
```

> **Note:** `main.py` を編集する必要はありません。

## スキーマ（リクエスト/レスポンス定義）

`app/schemas/` にリクエストやレスポンスの型を Pydantic モデルで定義します。

例: `app/schemas/hoge.py`

```python
from pydantic import BaseModel


# レスポンス用スキーマ
class HogeResponse(BaseModel):
    Hello: str


# リクエスト用スキーマ（POST等で使う場合）
class HogeCreate(BaseModel):
    message: str
```

エンドポイントでの使い方:

```python
from app.schemas.hoge import HogeResponse, HogeCreate

@router.get("/", response_model=HogeResponse)
def read_hoge():
    return {"Hello": "Hoge"}

@router.post("/", response_model=HogeResponse)
def create_hoge(body: HogeCreate):
    return {"Hello": body.message}
```

- `response_model` を指定するとレスポンスの型が自動でバリデーション & ドキュメント化されます
- リクエストボディは引数に型を付けるだけで自動パースされます
