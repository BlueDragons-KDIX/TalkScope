# Local STT Server (Accurate Mode)

`accurate` モードで使う、無料・PC内完結の文字起こしサーバーです。

## 1. セットアップ

```bash
cd Frontend/tests/local-stt
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. サーバー起動

```bash
uvicorn server:app --host 127.0.0.1 --port 8765
```

初回はモデルダウンロードで時間がかかります。

## 3. Frontend の設定

`Frontend/.env.local` に以下を設定:

```env
VITE_TRANSCRIPTION_MODE_DEFAULT=fast
VITE_LOCAL_STT_URL=http://127.0.0.1:8765/transcribe
```

## 4. 使い方

1. Frontend で文字起こしウィンドウを開く
2. モードを `正確さ重視` に切替
3. 録音開始 → 録音停止
4. 停止後、ローカルSTT結果が反映される

## 補足

- `速度重視` は WebSpeechAPI（リアルタイム）
- `正確さ重視` は停止後に local STT で再認識
- どちらも無料で利用可能
