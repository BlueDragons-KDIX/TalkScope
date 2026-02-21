from dotenv import load_dotenv
load_dotenv()

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import db

db.init_db()

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
