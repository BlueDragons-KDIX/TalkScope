from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_vectorize_endpoint_returns_vectors() -> None:
    res = client.post(
        "/analysis/vectorize",
        json={
            "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
            "deduplicate": False,
        },
    )
    assert res.status_code == 200
    body = res.json()

    assert "meta" in body
    assert body["meta"]["vector_dim"] > 0
    assert body["meta"]["output_token_count"] > 0
    assert len(body["tokens"]) > 0

    surfaces = [token["surface"] for token in body["tokens"]]
    assert "そして" not in surfaces

    first = body["tokens"][0]
    assert {"surface", "base_form", "pos", "start", "end", "vector", "vector_dim", "vector_source"} <= set(first.keys())
    assert len(first["vector"]) == first["vector_dim"]


def test_vectorize_endpoint_validates_empty_text() -> None:
    res = client.post("/analysis/vectorize", json={"text": ""})
    assert res.status_code == 422
