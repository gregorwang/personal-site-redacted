-- Better Auth admin plugin user fields.

ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE user ADD COLUMN banned INTEGER DEFAULT 0;
ALTER TABLE user ADD COLUMN banReason TEXT;
ALTER TABLE user ADD COLUMN banExpires INTEGER;

CREATE INDEX IF NOT EXISTS idx_user_banned ON user(banned, banExpires);
