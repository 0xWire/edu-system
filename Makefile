.PHONY: build run clean test deps debug

build:
	go build -o bin/edu-system main.go

run:
	GIN_MODE=debug go run main.go

debug:
	GIN_MODE=debug LOG_LEVEL=debug go run main.go

deps:
	go mod tidy
	go mod download

clean:
	rm -rf bin/
	rm -f database.db


test:
	go test ./...


swagger:
	swag init -g main.go
