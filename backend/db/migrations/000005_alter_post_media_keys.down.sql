-- 000005_alter_post_media_keys.down.sql
ALTER TABLE post_media ALTER COLUMN object_key TYPE VARCHAR(255);
ALTER TABLE post_media ALTER COLUMN thumbnail_key TYPE VARCHAR(255);
