-- Revert Migration 000002

DROP TABLE IF EXISTS friend_invites CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS passkey_credentials CASCADE;

DROP INDEX IF EXISTS idx_users_auth_provider;
DROP INDEX IF EXISTS idx_users_custom_id_lower;

ALTER TABLE users DROP COLUMN IF EXISTS auth_provider_id;
ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS custom_id;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
