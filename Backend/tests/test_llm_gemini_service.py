import asyncio

import pytest
import dotenv
dotenv.load_dotenv()

import app.services.llm as llm
from app.services.refer_dictionary_v1 import _generate_senses_for_terms


def test_generate_senses_for_terms_live() -> None:
    result = asyncio.run(
        _generate_senses_for_terms(
            senses_generater=llm.generate_term_senses,
            terms=[
                "フライパン",
                "TypeScript",
                "SSE",
                "自然言語処理",
                "Python",
                "機械学習",
                "深層学習",
                "Transformer",
                "BERT",
                "GPT",
                "ニューラルネットワーク",
            ],
            group_size=5,
        )
    )

    assert result
    assert set(result) == {
        "フライパン",
        "TypeScript",
        "SSE",
        "自然言語処理",
        "Python",
        "機械学習",
        "深層学習",
        "Transformer",
        "BERT",
        "GPT",
        "ニューラルネットワーク",
    }
    assert all(isinstance(senses, list) for senses in result.values())
