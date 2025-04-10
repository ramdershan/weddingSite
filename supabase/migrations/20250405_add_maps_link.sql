-- Migration to add Google Maps location link to events table
-- Date: 2025-04-05

-- Add maps_link column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS maps_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.maps_link IS 'Google Maps URL for the event location';

-- Update the trigger for updated_at
CREATE OR REPLACE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Update existing events to generate maps links from location
-- This will create a basic Google Maps link for any existing events with locations
UPDATE events 
SET maps_link = 'https://maps.google.com/maps?q=' || REPLACE(location, ' ', '+') 
WHERE location IS NOT NULL AND maps_link IS NULL; 