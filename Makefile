COMPOSE ?= docker compose

.PHONY: help build build-frontend build-backend up up-build up-frontend up-backend up-frontend-build up-backend-build down down-v logs logs-frontend logs-backend ps docker-clean

help:
	@echo "利用可能なコマンド:"
	@echo "  make build          # Frontend/Backend のイメージをビルド"
	@echo "  make up             # Frontend + Backend を起動（再ビルドなし）"
	@echo "  make up-build       # Frontend + Backend をビルドして起動"
	@echo "  make up-frontend    # Frontend のみ起動（再ビルドなし）"
	@echo "  make up-backend     # Backend のみ起動（再ビルドなし）"
	@echo "  make up-frontend-build # Frontend をビルドして起動"
	@echo "  make up-backend-build  # Backend をビルドして起動"
	@echo "  make down           # コンテナ停止・削除"
	@echo "  make down-v         # コンテナ停止・削除（volume も削除）"
	@echo "  make logs           # 全サービスのログを表示"
	@echo "  make logs-frontend  # Frontend ログを表示"
	@echo "  make logs-backend   # Backend ログを表示"
	@echo "  make ps             # コンテナ状態を表示"
	@echo "  make docker-clean   # Dockerの未使用build cacheを削除"

build:
	$(COMPOSE) build

build-frontend:
	$(COMPOSE) build frontend

build-backend:
	$(COMPOSE) build backend

up:
	$(COMPOSE) up -d frontend backend
	@echo ""
	@echo "起動しました。アクセス先:"
	@echo "  Frontend    : http://localhost:5173"
	@echo "  Backend API : http://localhost:8000"
	@echo "  Swagger UI  : http://localhost:8000/docs"

up-build:
	$(COMPOSE) up -d --build frontend backend
	@echo ""
	@echo "起動しました。アクセス先:"
	@echo "  Frontend    : http://localhost:5173"
	@echo "  Backend API : http://localhost:8000"
	@echo "  Swagger UI  : http://localhost:8000/docs"

up-frontend:
	$(COMPOSE) up -d frontend

up-frontend-build:
	$(COMPOSE) up -d --build frontend

up-backend:
	$(COMPOSE) up -d backend

up-backend-build:
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

docker-clean:
	@docker builder prune -af || (echo "docker builder prune を再試行します..." && sleep 1 && docker builder prune -af)
