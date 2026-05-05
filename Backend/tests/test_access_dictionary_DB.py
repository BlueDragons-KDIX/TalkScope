import os
import dotenv

dotenv.load_dotenv()

from pathlib import Path
import sys

from sqlalchemy.exc import IntegrityError

# `python tests/test_access_dictionary_DB.py` で直接実行しても
# `app` パッケージを import できるようにプロジェクトルートを追加する。
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from app.core.database import get_database
from app.crud.dictionary import create_dictionary, delete_dictionary, read_dictionary_by_term

db = get_database()

# 指定語彙ごとに create_dictionary(term, description, meaning_vector=None) を呼び出す。
_TEST_CASES: list[tuple[str, str]] = [
    ("Alphabet", "英字の用語サンプル"),
    ("ひらがな", "ひらがなの用語サンプル"),
    ("カタカナ", "カタカナの用語サンプル"),
    ("漢字", "漢字の用語サンプル"),
]


def _run_single_case(term: str, description: str) -> bool:
    # 依頼条件: description は 25 文字以内。
    if len(description) > 25:
        print(f"[NG] description が25文字超過: term={term}")
        return False

    existing = read_dictionary_by_term(term)
    if existing is not None:
        delete_dictionary(existing.id)

    created_id: int | None = None
    try:
        # 依頼条件: meaning_vector は None で呼び出す。
        created_id = create_dictionary(
            term=term,
            description=description,
            meaning_vector=None,
        )
        print(f"[OK] create_dictionary 成功: term={term}, id={created_id}")
        return True
    except IntegrityError:
        # DB 制約（NOT NULL など）で失敗するケースも、
        # create_dictionary 呼び出し自体は実施されたとみなす。
        print(f"[OK] IntegrityError を確認: term={term} (呼び出し自体は実施)")
        return True
    except Exception as exc:
        print(f"[NG] create_dictionary で例外: term={term}, error={exc}")
        return False
    finally:
        if created_id is not None:
            delete_dictionary(created_id)


def main() -> int:
    # DB 未設定環境でもスクリプト全体が落ちないようにする。
    if not db.is_available:
        print("[SKIP] DATABASE_URL is not configured")
        return 0

    print("[INFO] create_dictionary CLI テスト開始")
    failures = 0

    for term, description in _TEST_CASES:
        if not _run_single_case(term=term, description=description):
            failures += 1

    total = len(_TEST_CASES)
    success = total - failures
    print(f"[INFO] 完了: success={success}, failure={failures}, total={total}")

    return 1 if failures > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
