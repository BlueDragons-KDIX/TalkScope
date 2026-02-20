import fastapi

router = fastapi.APIRouter()

@router.get("/")
def read_hoge():
    return {"Hello": "Hoge"}