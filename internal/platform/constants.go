package platform

const (
	// User roles
	RoleUser  = "user"
	RoleAdmin = "admin"

	// JWT claims
	ClaimUserID = "user_id"
	ClaimEmail  = "email"
	ClaimRole   = "role"

	// HTTP headers
	HeaderAuthorization = "Authorization"
	HeaderContentType   = "Content-Type"

	// Content types
	ContentTypeJSON = "application/json"

	// Default values
	DefaultPageSize = 10
	MaxPageSize     = 100

	// Validation limits
	MinPasswordLength = 6
	MaxNameLength     = 50
)
