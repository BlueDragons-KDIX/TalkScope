# Cloud Run デプロイワークフロー（Backend）

LexiFlow Backend（FastAPI）を Google Cloud Run へデプロイするための手順です。

## 0. 変数を設定

```bash
PROJECT_ID="kc3hack2026"
REGION="asia-southeast1"
SERVICE_NAME="lexiflow-backend"
SECRET_NAME="gemini-api-key"
CERT_SECRET_NAME="cockroach-root-crt"
```

- GCP のシンガポールリージョン名は `asia-southeast1`（AWS の `ap-southeast-1` とは表記が異なる）

## 1. 初回セットアップ（プロジェクトごとに1回）

### 1-1. プロジェクト切替

```bash
gcloud config set project "$PROJECT_ID"
```

### 1-2. 必要 API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"
```

### 1-3. Secret を作成（ダミー）

```bash
printf '%s' 'DUMMY_REPLACE_IN_CONSOLE' | \
  gcloud secrets create "$SECRET_NAME" \
  --data-file=- \
  --replication-policy=automatic \
  --project "$PROJECT_ID"
```

既に Secret がある場合:

```bash
printf '%s' 'DUMMY_REPLACE_IN_CONSOLE' | \
  gcloud secrets versions add "$SECRET_NAME" \
  --data-file=- \
  --project "$PROJECT_ID"
```

### 1-4. Cloud Run 実行サービスアカウントに Secret 参照権限を付与

```bash
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project "$PROJECT_ID"
```

証明書 Secret も同様に付与:

```bash
gcloud secrets add-iam-policy-binding "$CERT_SECRET_NAME" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project "$PROJECT_ID"
```

## 2. デプロイ（通常運用）

リポジトリルート（`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026`）で実行:

```bash
gcloud run deploy "$SERVICE_NAME" \
  --quiet \
  --source /Users/honmayuudai/MyHobby/hackson/KC3Hack2026/Backend \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 10 \
  --timeout 60 \
  --min-instances 0 \
  --max-instances 2 \
  --set-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest,/root/.postgresql/root.crt=${CERT_SECRET_NAME}:latest" \
  --set-env-vars "GEMINI_MODEL=gemini-2.5-flash-lite,GEMINI_TIMEOUT_SECONDS=10,GEMINI_PARALLELISM=3,ENABLE_DB_INIT=false"
```

## 3. デプロイ後の確認

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')

echo "$SERVICE_URL"
curl -sS "$SERVICE_URL/"
curl -sS -X POST "$SERVICE_URL/analysis/vectorize/sentence" \
  -H "Content-Type: application/json" \
  -d '{"text":"本日の議事録を作成します。API設計と実装方針を共有します。","normalize":true}'
```

## 4. Secret をコンソールで本番値に差し替えた後

`latest` を参照しているため、新インスタンス起動時には新しい値が使われます。
すぐ反映を確実にしたい場合は再デプロイ（またはサービス更新）を1回実行します。

```bash
gcloud run services update "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-secrets "GEMINI_API_KEY=${SECRET_NAME}:latest"
```

証明書 Secret を更新した場合:

```bash
gcloud run services update "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-secrets "/root/.postgresql/root.crt=${CERT_SECRET_NAME}:latest"
```

## 5. CORS（フロント本番URL）設定例

`ALLOWED_ORIGINS` はカンマ区切りで指定:

```bash
gcloud run services update "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --update-env-vars "ALLOWED_ORIGINS=https://your-frontend.example.com"
```

## 6. 旧環境削除（任意）

```bash
OLD_PROJECT_ID="jphacks2025-475500"
OLD_REGION="asia-northeast1"

gcloud run services delete "$SERVICE_NAME" \
  --project "$OLD_PROJECT_ID" \
  --region "$OLD_REGION" \
  --quiet

gcloud secrets delete "$SECRET_NAME" \
  --project "$OLD_PROJECT_ID" \
  --quiet
```

## 7. GitHub Actions で自動デプロイ

`/Users/honmayuudai/MyHobby/hackson/KC3Hack2026/.github/workflows/deploy-backend-cloud-run.yml` を使う場合、
GitHub Repository Secrets に以下を登録します。

- `GCP_SA_KEY`: Cloud Run デプロイ権限を持つサービスアカウント JSON キー

このワークフローは `develop` / `main` への push（`Backend/**` 変更時）で自動実行されます。
