import fastapi

router = fastapi.APIRouter()


@router.get("/")
def hoge():
    return {"hoge": "fuga"}
