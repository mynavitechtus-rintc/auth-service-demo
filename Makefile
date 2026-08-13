# Include .env file if present
-include .env
export

PORT ?= 3000
DB_PORT ?= 5432
REDIS_PORT ?= 6379

.PHONY: all dev start kill-port kill-db-ports db-up db-down setup reset help

# Default command: start dev environment
all: dev

# Ensure Docker DB/Redis containers are running, kill any process holding PORT, then run NestJS app
dev: db-up kill-port
	@echo "🚀 Starting NestJS application in watch mode..."
	pnpm run start:dev || npm run start:dev

# Alias for dev
start: dev

# Check and kill process using the application PORT (default 3000)
kill-port:
	@echo "🔍 Checking for process running on port $(PORT)..."
	@PID=$$(lsof -ti:$(PORT) 2>/dev/null); \
	if [ -n "$$PID" ]; then \
		echo "⚠️ Killing process on port $(PORT) (PID: $$PID)..."; \
		kill -9 $$PID 2>/dev/null || true; \
		sleep 1; \
		echo "✅ Port $(PORT) released."; \
	else \
		echo "✅ Port $(PORT) is clear."; \
	fi

# Helper to kill processes taking Postgres (5432) or Redis (6379) ports if needed
kill-db-ports:
	@echo "🔍 Checking for processes on DB ports ($(DB_PORT), $(REDIS_PORT))..."
	@for port in $(DB_PORT) $(REDIS_PORT); do \
		PID=$$(lsof -ti:$$port 2>/dev/null); \
		if [ -n "$$PID" ]; then \
			echo "⚠️ Killing process on port $$port (PID: $$PID)..."; \
			kill -9 $$PID 2>/dev/null || true; \
		fi \
	done
	@echo "✅ Database ports checked."

# Start database and redis containers
db-up:
	@echo "🚀 Starting Postgres and Redis via Docker Compose..."
	@docker compose up -d

# Stop database containers
db-down:
	@echo "🛑 Stopping Docker containers..."
	@docker compose down

# Full initial setup (install, generate Prisma, migrate DB, seed)
setup: db-up
	@echo "📦 Installing dependencies..."
	@pnpm install || npm install
	@echo "⚙️ Generating Prisma client..."
	@npx prisma generate
	@echo "🗄️ Running database migrations..."
	@npx prisma migrate dev
	@echo "🌱 Seeding database..."
	@pnpm run seed || npm run seed

# Reset DB volume and re-seed
reset:
	@echo "♻️ Resetting DB container & volume..."
	@docker compose down -v
	@docker compose up -d
	@echo "🗄️ Re-running migrations..."
	@npx prisma migrate dev
	@echo "🌱 Re-seeding database..."
	@pnpm run seed || npm run seed

# Show help menu
help:
	@echo "=========================================================="
	@echo " 🛠️  Auth Service Demo - Makefile Commands"
	@echo "=========================================================="
	@echo "  make dev (or make start) : Run app (kills port $(PORT) if busy + starts DB)"
	@echo "  make kill-port           : Kill any process using port $(PORT)"
	@echo "  make kill-db-ports       : Kill processes using port $(DB_PORT) or $(REDIS_PORT)"
	@echo "  make db-up               : Start Postgres & Redis Docker containers"
	@echo "  make db-down             : Stop Postgres & Redis Docker containers"
	@echo "  make setup               : Install deps, migrate DB, and seed data"
	@echo "  make reset               : Wipe DB volume, run migrations & seed fresh"
	@echo "=========================================================="
