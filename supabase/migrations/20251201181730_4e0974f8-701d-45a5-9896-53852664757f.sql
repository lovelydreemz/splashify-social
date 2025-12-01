-- Add LinkedIn and Instagram credentials to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,
ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;

-- Add platform selection and platform-specific content to scheduled_posts
ALTER TABLE scheduled_posts
ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '{"threads": false, "linkedin": false, "instagram": false}'::jsonb,
ADD COLUMN IF NOT EXISTS platform_content JSONB DEFAULT '{}'::jsonb;

-- Add platform column to post_history
ALTER TABLE post_history
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'threads';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platforms ON scheduled_posts USING gin(platforms);
CREATE INDEX IF NOT EXISTS idx_post_history_platform ON post_history(platform);