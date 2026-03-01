-- Database trigger to call Edge Function when new auction is inserted
-- This will automatically trigger email notifications for matching users

-- Enable pg_net extension (required for HTTP requests from database)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call the Edge Function
CREATE OR REPLACE FUNCTION notify_new_auction()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
BEGIN
  -- Use the actual project URL (updated from placeholder)
  -- IMPORTANT: Replace YOUR_PROJECT_REF with your actual Supabase project reference
  function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auction-notifications-smtp';
  
  -- Call the Edge Function asynchronously using pg_net extension
  -- The service_role_key is stored in database settings (see FIX_AUTO_NOTIFICATIONS.md)
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'auction', row_to_json(NEW),
      'type', 'immediate'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auctions table
CREATE TRIGGER auction_notification_trigger
AFTER INSERT ON auctions
FOR EACH ROW
EXECUTE FUNCTION notify_new_auction();

-- Note: If you don't want to use triggers (for performance reasons),
-- you can instead call the Edge Function manually after inserting auctions,
-- or use a scheduled job to batch process new auctions periodically
