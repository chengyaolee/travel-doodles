package auth

import "context"

type authCtxKey string

const userContextKey authCtxKey = "authenticated_user"

// WithUser returns a context holding the authenticated User
func WithUser(ctx context.Context, u *User) context.Context {
	return context.WithValue(ctx, userContextKey, u)
}

// UserFromContext retrieves the authenticated User from context if present
func UserFromContext(ctx context.Context) *User {
	if val, ok := ctx.Value(userContextKey).(*User); ok {
		return val
	}
	return nil
}
