.PHONY: build run clean test deps

# Збірка проекту
build:
	go build -o bin/edu-system main.go

# Запуск проекту
run:
	go run main.go

# Встановлення залежностей
deps:
	go mod tidy
	go mod download

# Очищення
clean:
	rm -rf bin/
	rm -f database.db

# Тестування
test:
	go test ./...

# Запуск з автоперезавантаженням (потребує air)
dev:
	air

# Генерація swagger документації (потребує swag)
swagger:
	swag init -g main.go
