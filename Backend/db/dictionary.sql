CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE dictionary (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    description TEXT NOT NULL,
    meaning_vector VECTOR(300) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dictionary_word ON dictionary (word);