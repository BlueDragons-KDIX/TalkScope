import fastapi
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Backend/.env を起動時に読み込む（既存の環境変数は上書きしない）。
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from app.api import router

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
