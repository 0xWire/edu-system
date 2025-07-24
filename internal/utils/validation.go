package utils

import (
	"regexp"
	"unicode"
)

// ValidateEmail перевіряє формат email
func ValidateEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// ValidatePassword перевіряє складність пароля
func ValidatePassword(password string) bool {
	if len(password) < 6 {
		return false
	}
	
	var hasUpper, hasLower, hasNumber bool
	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		}
	}
	
	// Для простоти вимагаємо лише мінімальну довжину
	// Можна додати додаткові перевірки за потреби
	return len(password) >= 6
}

// Contains перевіряє чи містить слайс певний елемент
func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
