import fastapi
from app.schemas.hoge import HogeResponse, HogeCreate
from app.services import hoge as hoge_service

router = fastapi.APIRouter()


@router.get("/", response_model=HogeResponse)
def read_hoge():
    return hoge_service.get_hoge()


@router.post("/", response_model=HogeResponse)
def create_hoge(body: HogeCreate):
    return hoge_service.create_hoge(body)
