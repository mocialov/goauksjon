-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_email 
ON user_notification_preferences(email);

-- Create index on enabled status for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_enabled 
ON user_notification_preferences(enabled) WHERE enabled = true;

-- Create a table to track sent notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  auction_id BIGINT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  notification_type TEXT DEFAULT 'immediate'
);

-- Create index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_notification_log_email_auction 
ON notification_log(email, auction_id);

-- Create index for cleanup queries (optional - for managing old logs)
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at 
ON notification_log(sent_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to manage their own preferences
-- Note: In production, you'd want proper authentication
-- For now, we allow public access for upsert/delete by email
CREATE POLICY "Users can insert their own preferences"
ON user_notification_preferences
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own preferences"
ON user_notification_preferences
FOR SELECT
USING (true);

CREATE POLICY "Users can update their own preferences"
ON user_notification_preferences
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own preferences"
ON user_notification_preferences
FOR DELETE
USING (true);

-- Notification log policies (read-only for users, write for edge functions)
CREATE POLICY "Service role can insert notification logs"
ON notification_log
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their notification logs"
ON notification_log
FOR SELECT
USING (true);

-- Grant necessary permissions
GRANT ALL ON user_notification_preferences TO anon, authenticated;
GRANT ALL ON notification_log TO anon, authenticated;
