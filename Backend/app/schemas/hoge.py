from pydantic import BaseModel


# レスポンス用スキーマ
class HogeResponse(BaseModel):
    Hello: str


# リクエスト用スキーマ（POST等で使う場合）
class HogeCreate(BaseModel):
    message: str
