"""
既存環境（word, meaning カラムが存在する状態）向けのマイグレーションスクリプト。
create_all では既存テーブルの列リネームに対応できないため、明示的に ALTER TABLE を実行します。

実行方法:
    cd Backend
    uv run python -m scripts.migrate_word_to_term
"""

import os
from dotenv import load_dotenv
from sqlalchemy import text
from app.core.database import db

def run_migration() -> None:
    # .env を読み込む
    load_dotenv()
    
    if not db.is_available:
        print("❌ DATABASE_URL が設定されていないか、DBに接続できません。")
        return

    print("⚠️ マイグレーションを開始します: dictionary テーブルの列リネーム...")
    
    try:
        with db.engine.begin() as conn:
            # カラム 'word' が存在するか確認し、存在すれば 'term' に変更
            print("  -> 'word' カラムを 'term' にリネームしています...")
            try:
                conn.execute(text("ALTER TABLE dictionary RENAME COLUMN word TO term"))
                print("    ✅ 'word' を 'term' にリネームしました。")
            except Exception as e:
                print(f"    ℹ️ リネームスキップ（既に変更されているか、カラムがありません）: {e}")

            # カラム 'meaning' が存在するか確認し、存在すれば 'description' に変更
            print("  -> 'meaning' カラムを 'description' にリネームしています...")
            try:
                conn.execute(text("ALTER TABLE dictionary RENAME COLUMN meaning TO description"))
                print("    ✅ 'meaning' を 'description' にリネームしました。")
            except Exception as e:
                print(f"    ℹ️ リネームスキップ（既に変更されているか、カラムがありません）: {e}")

            # UNIQUE 制約/インデックスの移行 (旧: idx_dictionary_word -> 新: idx_dictionary_term)
            print("  -> 古いインデックスを削除し、新しいユニークインデックスを作成しています...")
            try:
                # 既存のインデックスがあれば削除
                conn.execute(text("DROP INDEX IF EXISTS idx_dictionary_word"))
                # 新しいユニークインデックスを作成
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_dictionary_term ON dictionary(term)"))
                print("    ✅ ユニークインデックス idx_dictionary_term の作成を完了しました。")
            except Exception as e:
                print(f"    ⚠️ インデックス移行エラー (スキップ): {e}")

        print("🎉 マイグレーションが完了しました。")

    except Exception as e:
        print(f"❌ マイグレーション中にエラーが発生しました: {e}")

if __name__ == "__main__":
    run_migration()
