import fastapi
from app.api import router

app = fastapi.FastAPI()

app.include_router(router)

@app.get("/")
def read_root():
    return {"Hello": "World"}