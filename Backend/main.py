from dotenv import load_dotenv
load_dotenv()

import fastapi
from app.api import router
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import db

db.init_db()

app = fastapi.FastAPI()

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