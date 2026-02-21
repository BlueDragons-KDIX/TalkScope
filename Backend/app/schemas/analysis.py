from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class VectorizeRequest(BaseModel):
    text: str = Field(
        min_length=1,
        description="解析対象テキスト",
        examples=["今日は自然言語処理を勉強して、そして結果を共有します。"],
    )
    include_pos: list[str] | None = Field(
        default=None,
        description="ベクトル化対象に含める品詞。未指定時は名詞・動詞などの既定値を使用",
        examples=[["名詞", "動詞", "形容詞"]],
    )
    exclude_pos: list[str] | None = Field(
        default=None,
        description="ベクトル化対象から除外する品詞。未指定時は接続詞・助詞などを除外",
        examples=[["接続詞", "助詞", "助動詞", "補助記号"]],
    )
    min_length: int = Field(
        default=1,
        ge=1,
        le=64,
        description="語長の最小値（短い語を除外したい時に使う）",
        examples=[2],
    )
    deduplicate: bool = Field(
        default=False,
        description="同一基本形を1件に集約するか",
        examples=[False],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
                    "deduplicate": False,
                },
                {
                    "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
                    "include_pos": ["名詞", "動詞", "形容詞"],
                    "exclude_pos": ["接続詞", "助詞", "助動詞", "補助記号"],
                    "min_length": 2,
                    "deduplicate": True,
                },
            ]
        }
    }


class VectorizedToken(BaseModel):
    surface: str = Field(description="表層形")
    base_form: str = Field(description="基本形")
    pos: str = Field(description="品詞")
    start: int = Field(description="入力文字列での開始インデックス")
    end: int = Field(description="入力文字列での終了インデックス")
    vector: list[float] = Field(
        description="ベクトル値（vector_dim 個）。長いためUI上では省略表示されることがあります",
        examples=[[0.026334, -0.100751, 0.185528, 0.004324]],
    )
    vector_dim: int = Field(description="ベクトル次元数", examples=[300])
    vector_source: str = Field(
        description="ベクトルの取得元（spacy または hash）",
        examples=["spacy"],
    )


class VectorizeMeta(BaseModel):
    model: str = Field(description="利用した埋め込みモデル名", examples=["ginza"])
    vector_dim: int = Field(description="レスポンス全体のベクトル次元", examples=[300])
    input_token_count: int = Field(description="形態素解析後のトークン数", examples=[15])
    output_token_count: int = Field(description="ベクトル化して返したトークン数", examples=[7])
    vector_source_counts: dict[str, int] = Field(
        default_factory=dict,
        description="ベクトル取得元ごとの件数",
        examples=[{"spacy": 6, "hash": 1}],
    )


class VectorizeResponse(BaseModel):
    text: str = Field(description="入力テキスト（そのまま返却）")
    meta: VectorizeMeta = Field(description="解析メタ情報")
    tokens: list[VectorizedToken] = Field(description="ベクトル化したトークン一覧")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "今日は自然言語処理を勉強して、そして結果を共有します。",
                    "meta": {
                        "model": "ginza",
                        "vector_dim": 300,
                        "input_token_count": 15,
                        "output_token_count": 7,
                        "vector_source_counts": {"spacy": 6, "hash": 1},
                    },
                    "tokens": [
                        {
                            "surface": "自然言語処理",
                            "base_form": "自然言語処理",
                            "pos": "名詞",
                            "start": 3,
                            "end": 9,
                            "vector": [0.011231, -0.042001, 0.008821, -0.005238],
                            "vector_dim": 300,
                            "vector_source": "spacy",
                        }
                    ],
                }
            ]
        }
    }


class SentenceVectorizeRequest(BaseModel):
    text: str = Field(
        min_length=1,
        description="文章ベクトル化対象テキスト",
        examples=["本日の議事録を作成します。API設計と実装方針を共有します。"],
    )
    normalize: bool = Field(
        default=True,
        description="L2正規化したベクトルを返すか",
        examples=[True],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"text": "本日の議事録を作成します。API設計と実装方針を共有します。", "normalize": True}
            ]
        }
    }

    @field_validator("text")
    @classmethod
    def validate_text_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value


class SentenceVectorizeMeta(BaseModel):
    model: str = Field(description="利用した埋め込みモデル名", examples=["ginza"])
    vector_dim: int = Field(description="文章ベクトル次元", examples=[300])
    vector_source: str = Field(
        description="文章ベクトルの取得元（spacy_doc / spacy_token_avg / content_token_avg / hash）",
        examples=["spacy_doc"],
    )
    normalize: bool = Field(description="正規化を適用したか", examples=[True])
    input_token_count: int = Field(description="形態素解析後のトークン数", examples=[15])
    content_token_count: int = Field(description="内容語として採用されたトークン数", examples=[7])


class SentenceVectorizeResponse(BaseModel):
    text: str = Field(description="入力テキスト（そのまま返却）")
    meta: SentenceVectorizeMeta = Field(description="文章ベクトル化メタ情報")
    sentence_vector: list[float] = Field(
        description="文章ベクトル（vector_dim 個）",
        examples=[[0.0312, -0.0124, 0.2011, -0.0942]],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "本日の議事録を作成します。API設計と実装方針を共有します。",
                    "meta": {
                        "model": "ginza",
                        "vector_dim": 300,
                        "vector_source": "spacy_doc",
                        "normalize": True,
                        "input_token_count": 13,
                        "content_token_count": 6,
                    },
                    "sentence_vector": [0.0312, -0.0124, 0.2011, -0.0942],
                }
            ]
        }
    }


class ReferDictionaryRequest(BaseModel):
    text: str = Field(
        min_length=1,
        description="辞書検索対象のテキスト。名詞を自動抽出し辞書検索する",
        examples=["人工知能と機械学習を学ぶ"],
    )

    @field_validator("text")
    @classmethod
    def validate_text_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value


class ReferDictionaryEntry(BaseModel):
    term: str = Field(description="辞書検索した用語", examples=["人工知能"])
    description: str = Field(
        description="用語の説明",
        examples=["人間の知能を模倣するコンピュータシステムの総称です。"],
    )
    meaning_vector: list[float] | None = Field(
        default=None,
        description="用語の意味ベクトル（300次元）",
    )
    source: str = Field(
        description="取得元（db: DB キャッシュ / llm: LLM生成）",
        examples=["llm"],
    )


class ReferDictionaryResponse(BaseModel):
    text: str = Field(description="入力テキスト（そのまま返却）")
    entries: list[ReferDictionaryEntry] = Field(
        description="辞書検索結果の一覧",
    )

