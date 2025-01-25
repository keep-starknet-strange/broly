build: build-backend build-frontend build-contracts
test: contracts-test

build-backend:
	@echo "Building backend..."
	@cd apps/backend && rm -rf bin/ && mkdir bin
	@cd apps/backend && go build -o bin ./...

build-frontend:
	@echo "Building frontend..."
	@cd apps/web && npm run build

build-contracts:
	@echo "Building contracts..."
	@cd packages/onchain && scarb build

contracts-test:
	@echo "Testing contracts..."
	@cd packages/onchain && scarb test

docker-build:
	$(eval APP_VERSION := $(shell cat packages/infra/Chart.yaml | yq eval '.appVersion' -))
	$(eval COMMIT_SHA := $(shell git rev-parse --short HEAD))
	@echo "Building docker images with version $(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Building backend..."
	docker build . -f apps/backend/Dockerfile.prod -t "brandonjroberts/broly-backend:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Building websockets..."
	docker build . -f apps/backend/Dockerfile.websockets.prod -t "brandonjroberts/broly-websockets:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Building consumer..."
	docker build . -f apps/backend/Dockerfile.consumer.prod -t "brandonjroberts/broly-consumer:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Building inscriber..."
	docker build . -f apps/backend/Dockerfile.inscriber.prod -t "brandonjroberts/broly-inscriber:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Building indexer..."	
	docker build . -f packages/indexer/Dockerfile.prod -t "brandonjroberts/broly-indexer:$(APP_VERSION)-$(COMMIT_SHA)"

docker-push:
	$(eval APP_VERSION := $(shell cat packages/infra/Chart.yaml | yq eval '.appVersion' -))
	$(eval COMMIT_SHA := $(shell git rev-parse --short HEAD))
	@echo "Pushing docker images with version $(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Pushing backend..."
	docker push "brandonjroberts/broly-backend:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Pushing websockets..."
	docker push "brandonjroberts/broly-websockets:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Pushing consumer..."
	docker push "brandonjroberts/broly-consumer:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Pushing inscriber..."
	docker push "brandonjroberts/broly-inscriber:$(APP_VERSION)-$(COMMIT_SHA)"
	@echo "Pushing indexer..."
	docker push "brandonjroberts/broly-indexer:$(APP_VERSION)-$(COMMIT_SHA)"

helm-uninstall:
	@echo "Uninstalling helm chart..."
	helm uninstall broly-infra

helm-install:
	$(eval COMMIT_SHA := $(shell git rev-parse --short HEAD))
	@echo "Installing helm chart..."
	helm install --set postgres.password=$(POSTGRES_PASSWORD) --set deployments.sha=$(COMMIT_SHA) --set apibara.authToken=$(AUTH_TOKEN) broly-infra packages/infra

helm-template:
	$(eval COMMIT_SHA := $(shell git rev-parse --short HEAD))
	@echo "Rendering helm chart..."
	helm template --set postgres.password=$(POSTGRES_PASSWORD) --set deployments.sha=$(COMMIT_SHA) --set apibara.authToken=$(AUTH_TOKEN) broly-infra packages/infra

helm-upgrade:
	$(eval COMMIT_SHA := $(shell git rev-parse --short HEAD))
	@echo "Upgrading helm chart..."
	helm upgrade --set postgres.password=$(POSTGRES_PASSWORD) --set deployments.sha=$(COMMIT_SHA) --set apibara.authToken=$(AUTH_TOKEN) broly-infra packages/infra
