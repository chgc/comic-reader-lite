set shell := ["pwsh.exe", "-NoLogo", "-Command"]
set dotenv-load := true

compose := "docker compose"

default: help

help:
  @echo "Recipes:"
  @echo "  install       Install frontend dependencies"
  @echo "  test          Run backend tests"
  @echo "  build         Build backend + frontend production bundle"
  @echo "  docker-build  Build docker images"
  @echo "  up            Start full stack (defaults: frontend:28000, backend:28080)"
  @echo "  up-custom     Start with custom ports (e.g. just up-custom 39000 39080)"
  @echo "  down          Stop full stack"
  @echo "  restart       Restart full stack with rebuild"
  @echo "  logs          Follow compose logs"
  @echo "  ps            Show compose service status"
  @echo "  release       Test + build + docker-build + up"

install:
  cd frontend; npm ci

test: test-backend

test-backend:
  cd backend; go test ./...

build: build-backend build-frontend

build-backend:
  cd backend; go build -o backend.exe .

build-frontend:
  cd frontend; npm run build -- --configuration production

docker-build:
  {{compose}} build

up:
  {{compose}} up -d --build

up-custom frontend_port backend_port:
  $env:FRONTEND_PORT="{{frontend_port}}"; $env:BACKEND_PORT="{{backend_port}}"; {{compose}} up -d --build

down:
  {{compose}} down

restart:
  {{compose}} down
  {{compose}} up -d --build

logs:
  {{compose}} logs -f

ps:
  {{compose}} ps

release: test build docker-build up
