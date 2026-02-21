import fastapi

router = fastapi.APIRouter()

# 新しくエンドポイントを追加するときは、
# 1. app/api/endpoints/new_endpoint.pyを作成する
# 2. app/api/endpoints/new_endpoint.pyにrouterを作成する
# 3. app/api/endpoints/new_endpoint.pyにエンドポイントを追加する
# 4. app/api/__init__.pyにrouter.include_router(new_endpoint.router)を追加する
