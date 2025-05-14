-- Migration to add RSVP open date to events table
-- Date: 2025-05-07

-- Add rsvp_open_date column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_open_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN events.rsvp_open_date IS 'Date when RSVPs open for this event. If NULL, RSVPs are open immediately.';

-- Update existing events to set appropriate RSVP open dates
-- Set engagement ceremony to open May 14th, 2025
UPDATE events 
SET rsvp_open_date = '2025-05-14' 
WHERE code = 'engagement';

-- Set wedding and reception to open August 1st, 2025
UPDATE events 
SET rsvp_open_date = '2025-08-01' 
WHERE code IN ('wedding', 'reception');

-- Update the trigger for updated_at
CREATE OR REPLACE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();