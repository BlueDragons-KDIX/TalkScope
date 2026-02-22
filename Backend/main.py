from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Backend/.env を起動時に読み込む（既存の環境変数は上書きしない）。
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from app.api import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    """アプリの起動・終了時に実行されるライフスパンイベント。"""
    # 起動時: 明示的に有効化された場合のみ DB 初期化を実行する。
    db_init_enabled = os.environ.get("ENABLE_DB_INIT", "").lower() in {"1", "true", "yes"}
    if db_init_enabled and os.environ.get("DATABASE_URL"):
        from app.core.database import db
        db.init_db()
        logger.info("DB 初期化完了")
    elif os.environ.get("DATABASE_URL"):
        logger.info("DATABASE_URL は設定済みだが ENABLE_DB_INIT が無効のためスキップ")
    else:
        logger.warning("DATABASE_URL 未設定のため、DB 初期化をスキップ")
    yield
    # 終了時: 必要に応じてクリーンアップ


app = fastapi.FastAPI(
    title="LexiFlow Backend API",
    version="0.1.0",
    description=(
        "LexiFlow のバックエンドAPIです。"
        " 現在はテキスト解析・ベクトル化のMVP機能を提供します。"
        " フロント連携時は /analysis/vectorize を利用してください。"
    ),
    openapi_tags=[
        {"name": "analysis", "description": "テキスト解析・ベクトル化API"},
        {"name": "dictionary", "description": "単語の意味概要検索API"},
        {"name": "hoge", "description": "サンプルAPI"},
    ],
    lifespan=lifespan,
)

default_origins = [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173",
    "http://127.0.0.1:51080",
    "https://talkscope-kc3hack.vercel.app"
]
env_origins = [
    origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()
]
allow_origins = list(dict.fromkeys(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
