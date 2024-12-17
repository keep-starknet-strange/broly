FROM golang:1.23.1-alpine

RUN apk add --no-cache bash curl git jq yq

# Copy over the configs
WORKDIR /configs
COPY ./apps/backend/configs/docker.config.yaml /configs/config.yaml

# Copy over the app
WORKDIR /app
COPY ./apps/backend/go.mod ./apps/backend/go.sum ./
RUN go mod download
COPY ./apps/backend .

# Build the app & run it
RUN go build -o broly-api ./cmd/broly-api/main.go

EXPOSE 8080

CMD ["./broly-api"]
