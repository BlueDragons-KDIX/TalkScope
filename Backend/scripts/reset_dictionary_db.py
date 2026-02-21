"""
辞書データベース（dictionaryテーブル）をリセットするスクリプト。
登録されているすべての単語データを削除し、テーブルを初期状態に戻します。

実行方法:
    cd Backend
    uv run python -m scripts.reset_dictionary_db
"""

import os
from dotenv import load_dotenv
from sqlalchemy import text

def reset_db() -> None:
    # .env を読み込む
    load_dotenv()
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ DATABASE_URL が設定されていません。")
        return

    from app.core.database import db
    
    print("⚠️ 辞書データベース(dictionary)をリセットします...")
    
    try:
        with db.engine.begin() as conn:
            # テーブルの削除
            print("  -> テーブルを削除しています...")
            conn.execute(text("DROP TABLE IF EXISTS dictionary"))
            
            # vector拡張機能の確認/作成
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            # テーブルの再作成
            print("  -> テーブルを再作成しています...")
            conn.execute(text("""
                CREATE TABLE dictionary (
                    id SERIAL PRIMARY KEY,
                    term TEXT NOT NULL,
                    description TEXT NOT NULL,
                    meaning_vector VECTOR(300) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            
            # インデックスの作成
            print("  -> インデックスを作成しています...")
            conn.execute(text("CREATE UNIQUE INDEX idx_dictionary_term ON dictionary (term)"))
            
        print("✅ データベースのリセットが完了しました。")
    except Exception as e:
        print(f"❌ リセット中にエラーが発生しました: {e}")

if __name__ == "__main__":
    reset_db()
