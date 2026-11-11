-- Migration 000002: Passwordless Authentication and Friend System
-- 1. Modify users table for passwordless auth and customizable user ID
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_id VARCHAR(32) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) NOT NULL DEFAULT 'passwordless';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_id VARCHAR(255);

-- Populate custom_id for any existing records
UPDATE users SET custom_id = LOWER(username) WHERE custom_id IS NULL;
ALTER TABLE users ALTER COLUMN custom_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_custom_id_lower ON users (LOWER(custom_id));
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users (auth_provider, auth_provider_id);

-- 2. Passkey / WebAuthn Credentials Table (True hardware-backed passwordless)
CREATE TABLE IF NOT EXISTS passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    sign_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkey_credentials (user_id);

-- 3. Mutual Friends Table (Canonical order: user_id_1 < user_id_2)
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(32) NOT NULL DEFAULT 'id', -- 'id', 'link'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_friend_order CHECK (user_id_1 < user_id_2),
    CONSTRAINT uq_friend_pair UNIQUE (user_id_1, user_id_2)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_1 ON friends (user_id_1);
CREATE INDEX IF NOT EXISTS idx_friends_user_2 ON friends (user_id_2);

-- 4. Friend Invite Links Table
CREATE TABLE IF NOT EXISTS friend_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL UNIQUE,
    max_uses INT NOT NULL DEFAULT 0, -- 0 = reusable unlimited
    uses_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_invites_code ON friend_invites (code);
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON friend_invites (inviter_id);
