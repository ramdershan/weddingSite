-- This migration updates existing phone numbers to be sequential and unique,
-- removes any old default, and adds a UNIQUE constraint.
-- It assumes the 'phone_number' column already exists, is TEXT, NOT NULL,
-- and has a CHECK constraint for 10 digits from a previous migration.

-- Step 1: Attempt to remove the old default constraint on phone_number.
-- It's okay if this fails if no default was set or it was already removed.
DO $$
BEGIN
   ALTER TABLE public.guests ALTER COLUMN phone_number DROP DEFAULT;
   RAISE NOTICE 'Successfully dropped default for phone_number column.';
EXCEPTION
   WHEN undefined_object THEN
      RAISE NOTICE 'Default for phone_number not found, skipping drop.';
   WHEN OTHERS THEN
      RAISE;
END $$;

-- Step 2: Update existing guests with unique, sequential 10-digit phone numbers.
-- Orders by created_at then id to ensure deterministic assignment.
-- Starts from '0000000000'.
WITH numbered_guests AS (
    SELECT
        id,
        (ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS FIRST, id ASC)) - 1 AS rn
    FROM
        public.guests
)
UPDATE
    public.guests g
SET
    phone_number = LPAD(ng.rn::TEXT, 10, '0')
FROM
    numbered_guests ng
WHERE
    g.id = ng.id;

-- Step 3: Add a UNIQUE constraint to the phone_number column.
-- This will ensure all phone numbers are unique going forward.
ALTER TABLE public.guests
ADD CONSTRAINT guests_phone_number_unique UNIQUE (phone_number);

-- Note: The NOT NULL constraint and the CHECK constraint (phone_number ~ '^[0-9]{10}$')
-- are assumed to be in place from the previous migration (e.g., 20250406_add_phone_number_to_guests.sql).
-- If that migration was not applied or was different, those constraints might need to be explicitly
-- added or verified in this script. For example:
-- ALTER TABLE public.guests ALTER COLUMN phone_number SET NOT NULL;
-- ALTER TABLE public.guests ADD CONSTRAINT check_phone_number_format_if_not_exists CHECK (phone_number ~ '^[0-9]{10}$'); 