# Edu System - Go REST API

Простенька архітектура REST API на Go з використанням Gin, GORM та JWT авторизації, створена за рекомендаціями Uber Go Style Guide.

## Архітектура проекту

```
├── main.go                 # Точка входу в додаток
├── .env                    # Конфігураційні змінні
├── Makefile               # Команди для збірки та запуску
├── go.mod                 # Go модулі
└── internal/              # Внутрішня логіка додатку
    ├── config/           # Конфігурація
    ├── database/         # Ініціалізація БД
    ├── dto/              # Data Transfer Objects
    ├── handlers/         # HTTP обробники (контролери)
    ├── middleware/       # Middleware для Gin
    ├── models/           # Моделі бази даних
    ├── repository/       # Шар доступу до даних
    ├── routes/           # Налаштування роутів
    └── service/          # Бізнес-логіка
```

## Особливості архітектури

- **Dependency Injection**: Всі залежності передаються через конструктори
- **Interface-based design**: Використання інтерфейсів для абстракції
- **Layered architecture**: Чіткий поділ на шари (handler -> service -> repository)
- **Clean separation**: Відділення бізнес-логіки від HTTP та БД
- **Error handling**: Централізована обробка помилок

## Швидкий старт

1. Встановіть залежності:
```bash
make deps
```

2. Запустіть сервер:
```bash
make run
```

## API Endpoints

### Авторизація
- `POST /api/v1/auth/register` - Реєстрація користувача
- `POST /api/v1/auth/login` - Вхід в систему
- `GET /api/v1/auth/profile` - Профіль користувача (потребує авторизації)

### Користувачі (потребують авторизації)
- `GET /api/v1/users` - Список користувачів
- `GET /api/v1/users/:id` - Користувач за ID

### Адміністрування (тільки для адмінів)
- `GET /api/v1/admin/dashboard` - Панель адміністратора

## Приклади використання

### Реєстрація
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "123456",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Вхід
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "123456"
  }'
```

### Отримання профілю
```bash
curl -X GET http://localhost:8080/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Конфігурація

Створіть файл `.env` з наступними параметрами:
```
DB_PATH=./database.db
JWT_SECRET=your-secret-key-change-in-production
GIN_MODE=debug
PORT=8080
```

## Команди Makefile

- `make build` - Збірка проекту
- `make run` - Запуск проекту  
- `make deps` - Встановлення залежностей
- `make clean` - Очищення файлів збірки
- `make test` - Запуск тестів

## Розширення

Для адаптації під свої задачі:

1. Додайте нові моделі в `internal/models/`
2. Створіть відповідні репозиторії в `internal/repository/`
3. Реалізуйте бізнес-логіку в `internal/service/`
4. Додайте HTTP обробники в `internal/handlers/`
5. Налаштуйте роути в `internal/routes/routes.go`

## Технології

- **Gin** - HTTP веб-фреймворк
- **GORM** - ORM для роботи з базою даних
- **JWT** - Авторизація через токени
- **SQLite** - База даних (легко змінити на PostgreSQL/MySQL)
- **bcrypt** - Хешування паролів
