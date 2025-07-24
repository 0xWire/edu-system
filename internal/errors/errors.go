package errors

import "errors"

// Authentication errors
var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserAlreadyExists  = errors.New("user with this email already exists")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token expired")
)

// Validation errors
var (
	ErrInvalidEmail  = errors.New("invalid email format")
	ErrWeakPassword  = errors.New("password is too weak")
	ErrMissingFields = errors.New("required fields are missing")
	ErrInvalidRole   = errors.New("invalid user role")
)

// Database errors
var (
	ErrDatabaseConnection = errors.New("database connection failed")
	ErrRecordNotFound     = errors.New("record not found")
	ErrDuplicateEntry     = errors.New("duplicate entry")
)

// Authorization errors
var (
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrInsufficientRights = errors.New("insufficient rights")
)
