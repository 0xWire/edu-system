.PHONY: build run run-demo clean test deps debug seed

build:
	go build -o bin/edu-system main.go

run:
	GIN_MODE=debug go run main.go

run-demo:
	DB_PATH=demo/demo.db GIN_MODE=debug go run main.go

debug:
	GIN_MODE=debug LOG_LEVEL=debug go run main.go

deps:
	go mod tidy
	go mod download

seed:
	go run ./cmd/seed

clean:
	rm -rf bin/
	rm -f database.db


test:
	go test ./...


swagger:
	swag init -g main.go
