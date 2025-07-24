.PHONY: build run clean test deps

build:
	go build -o bin/edu-system main.go

run:
	go run main.go

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
