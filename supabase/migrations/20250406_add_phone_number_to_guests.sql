ALTER TABLE public.guests
ADD COLUMN phone_number TEXT NOT NULL DEFAULT '0000000000';

-- Add a CHECK constraint to validate the phone_number format (exactly 10 digits)
-- The default '0000000000' (10 digits) satisfies this constraint.
ALTER TABLE public.guests
ADD CONSTRAINT check_phone_number_format
CHECK (phone_number ~ '^[0-9]{10}$');

-- Update existing NULL event_access to an empty array if needed, or a specific default.
-- This depends on how you want to handle existing rows after making event_access NOT NULL previously.
-- If event_access was already NOT NULL with a default, this might not be strictly necessary
-- but it's good to be explicit or to adjust based on the actual previous migration.

-- For new table, ensure phone_number does not allow NULLS from the start.
-- The command above already handles this for the new column.

-- It's also good practice to remove the default if it's only for backfilling
-- and not intended for new rows created without an explicit phone number.
-- Example: ALTER TABLE public.guests ALTER COLUMN phone_number DROP DEFAULT;
-- For now, we'll keep the default. 