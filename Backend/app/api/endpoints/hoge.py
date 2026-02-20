import fastapi
from app.schemas.hoge import HogeResponse, HogeCreate

router = fastapi.APIRouter()


@router.get("/", response_model=HogeResponse)
def read_hoge():
    return {"Hello": "Hoge"}


@router.post("/", response_model=HogeResponse)
def create_hoge(body: HogeCreate):
    return {"Hello": body.message}