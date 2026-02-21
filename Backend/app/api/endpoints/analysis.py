import fastapi

from app.schemas.analysis import VectorizeRequest, VectorizeResponse
from app.services.text_analysis import vectorize_content_tokens

router = fastapi.APIRouter()


@router.post("/vectorize", response_model=VectorizeResponse)
def vectorize(body: VectorizeRequest) -> VectorizeResponse:
    result = vectorize_content_tokens(
        text=body.text,
        include_pos=body.include_pos,
        exclude_pos=body.exclude_pos,
        min_length=body.min_length,
        deduplicate=body.deduplicate,
    )
    return VectorizeResponse(**result)
