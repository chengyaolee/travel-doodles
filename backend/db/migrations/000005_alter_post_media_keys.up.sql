-- 000005_alter_post_media_keys.up.sql
-- Allow post_media keys to safely store larger object keys or data URLs
ALTER TABLE post_media ALTER COLUMN object_key TYPE TEXT;
ALTER TABLE post_media ALTER COLUMN thumbnail_key TYPE TEXT;
