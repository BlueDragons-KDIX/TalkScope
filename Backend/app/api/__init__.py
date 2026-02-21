import fastapi
from app.api.endpoints import analysis, dictionary, hoge

router = fastapi.APIRouter()

router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
router.include_router(dictionary.router, prefix="/dictionary", tags=["dictionary"])
router.include_router(hoge.router, prefix="/hoge", tags=["hoge"])

# 新しくエンドポイントを追加するときは、
# 1. app/api/endpoints/new_endpoint.pyを作成する
# 2. app/api/endpoints/new_endpoint.pyにrouterを作成する
# 3. app/api/endpoints/new_endpoint.pyにエンドポイントを追加する
# 4. app/api/__init__.pyにrouter.include_router(new_endpoint.router)を追加する
