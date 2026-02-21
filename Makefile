COMPOSE ?= docker compose

.PHONY: help build up up-frontend up-backend down down-v logs logs-frontend logs-backend ps

help:
	@echo "利用可能なコマンド:"
	@echo "  make build          # Frontend/Backend のイメージをビルド"
	@echo "  make up             # Frontend + Backend を起動（バックグラウンド）"
	@echo "  make up-frontend    # Frontend のみ起動（バックグラウンド）"
	@echo "  make up-backend     # Backend のみ起動（バックグラウンド）"
	@echo "  make down           # コンテナ停止・削除"
	@echo "  make down-v         # コンテナ停止・削除（volume も削除）"
	@echo "  make logs           # 全サービスのログを表示"
	@echo "  make logs-frontend  # Frontend ログを表示"
	@echo "  make logs-backend   # Backend ログを表示"
	@echo "  make ps             # コンテナ状態を表示"

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d --build frontend backend
	@echo ""
	@echo "起動しました。アクセス先:"
	@echo "  Frontend    : http://localhost:5173"
	@echo "  Backend API : http://localhost:8000"
	@echo "  Swagger UI  : http://localhost:8000/docs"

up-frontend:
	$(COMPOSE) up -d --build frontend

up-backend:
	$(COMPOSE) up -d --build backend

down:
	$(COMPOSE) down

down-v:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f --tail=200

logs-frontend:
	$(COMPOSE) logs -f --tail=200 frontend

logs-backend:
	$(COMPOSE) logs -f --tail=200 backend

ps:
	$(COMPOSE) ps
