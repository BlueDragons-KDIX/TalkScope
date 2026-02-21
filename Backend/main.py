from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from app.api import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    """アプリの起動・終了時に実行されるライフスパンイベント。"""
    # 起動時: DB があれば初期化
    if os.environ.get("DATABASE_URL"):
        from app.core.database import db
        db.init_db()
        logger.info("DB 初期化完了")
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
        {"name": "hoge", "description": "サンプルAPI"},
    ],
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
