from app.schemas.hoge import HogeCreate, HogeResponse


def get_hoge() -> HogeResponse:
    return HogeResponse(Hello="Hoge")


def create_hoge(body: HogeCreate) -> HogeResponse:
    return HogeResponse(Hello=body.message)
