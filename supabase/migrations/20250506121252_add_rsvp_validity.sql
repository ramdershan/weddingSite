-- Add is_valid column to the rsvps table
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS is_valid BOOLEAN NOT NULL DEFAULT TRUE;

-- Create a view that dynamically calculates RSVP validity based on guest status and event access
DROP VIEW IF EXISTS public.valid_rsvps;
CREATE VIEW public.valid_rsvps AS
SELECT 
  r.id,
  r.guest_id,
  r.event_id,
  r.response,
  r.dietary_restrictions,
  r.has_plus_ones,
  r.plus_one_count,
  r.adult_count,
  r.children_count,
  r.notes,
  r.responded_at,
  r.updated_at,
  (g.is_active = TRUE AND EXISTS (
    SELECT 1 FROM public.guest_event_access gea 
    WHERE gea.guest_id = r.guest_id AND gea.event_id = r.event_id
  )) AS is_valid
FROM public.rsvps r
JOIN public.guests g ON r.guest_id = g.id;

-- Function to update the is_valid flag in the rsvps table
CREATE OR REPLACE FUNCTION public.update_rsvp_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_valid flag for affected RSVPs
  UPDATE public.rsvps
  SET is_valid = (
    EXISTS (
      SELECT 1 FROM public.guests g
      WHERE g.id = guest_id AND g.is_active = TRUE
    ) AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea
      WHERE gea.guest_id = guest_id AND gea.event_id = event_id
    )
  )
  WHERE 
    CASE 
      WHEN TG_TABLE_NAME = 'guests' THEN guest_id = NEW.id OR guest_id = OLD.id
      WHEN TG_TABLE_NAME = 'guest_event_access' THEN guest_id = NEW.guest_id OR guest_id = OLD.guest_id
      ELSE FALSE
    END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for guest table changes (activation/deactivation)
DROP TRIGGER IF EXISTS guests_rsvp_validity_trigger ON public.guests;
CREATE TRIGGER guests_rsvp_validity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.update_rsvp_validity();

-- Trigger for guest_event_access table changes
DROP TRIGGER IF EXISTS guest_event_access_rsvp_validity_trigger ON public.guest_event_access;
CREATE TRIGGER guest_event_access_rsvp_validity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.guest_event_access
FOR EACH ROW EXECUTE FUNCTION public.update_rsvp_validity();

-- Drop and recreate rsvp_summary view with direct filtering for valid RSVPs
DROP VIEW IF EXISTS public.rsvp_summary;
CREATE VIEW public.rsvp_summary AS
SELECT 
  e.code AS event_code,
  e.name AS event_name,
  e.category AS event_category,
  e.parent_event_id AS parent_event_code,
  COUNT(gea.id) AS total_invited_guests,
  COUNT(r.id) AS total_responded,
  COUNT(gea.id) - COUNT(r.id) AS not_responded,
  COUNT(r.id) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'Yes'::rsvp_response
  ) AS attending_count,
  COUNT(r.id) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'No'::rsvp_response
  ) AS not_attending_count,
  COUNT(r.id) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'Maybe'::rsvp_response
  ) AS maybe_attending_count,
  SUM(COALESCE(r.adult_count, 0) + COALESCE(r.children_count, 0)) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'Yes'::rsvp_response
  ) AS total_attendees,
  SUM(COALESCE(r.adult_count, 0)) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'Yes'::rsvp_response
  ) AS total_adults,
  SUM(COALESCE(r.children_count, 0)) FILTER (
    WHERE g.is_active = TRUE 
    AND EXISTS (
      SELECT 1 FROM public.guest_event_access gea2
      WHERE gea2.guest_id = r.guest_id AND gea2.event_id = r.event_id
    )
    AND r.response = 'Yes'::rsvp_response
  ) AS total_children
FROM public.events e
LEFT JOIN public.guest_event_access gea ON e.id = gea.event_id
LEFT JOIN public.rsvps r ON e.id = r.event_id AND gea.guest_id = r.guest_id
LEFT JOIN public.guests g ON r.guest_id = g.id
WHERE e.is_active = TRUE
GROUP BY e.id, e.code, e.name, e.category, e.parent_event_id
ORDER BY e.date;

-- Drop and recreate detailed_rsvps view with direct filtering for valid RSVPs
DROP VIEW IF EXISTS public.detailed_rsvps;
CREATE VIEW public.detailed_rsvps AS
SELECT 
  r.id AS rsvp_id,
  r.guest_id,
  g.full_name AS guest_name,
  e.code AS event_code,
  e.name AS event_name,
  e.category AS event_category,
  e.parent_event_id AS parent_event_code,
  r.response,
  r.dietary_restrictions,
  r.has_plus_ones,
  r.plus_one_count,
  r.adult_count,
  r.children_count,
  r.notes,
  r.responded_at,
  r.updated_at
FROM public.rsvps r
JOIN public.guests g ON r.guest_id = g.id
JOIN public.events e ON r.event_id = e.id
WHERE g.is_active = TRUE 
AND EXISTS (
  SELECT 1 FROM public.guest_event_access gea 
  WHERE gea.guest_id = r.guest_id AND gea.event_id = r.event_id
)
ORDER BY e.date, g.full_name;

-- Add comments for documentation
COMMENT ON COLUMN public.rsvps.is_valid IS 'Indicates if this RSVP should be considered valid based on guest status and event access';
COMMENT ON VIEW public.valid_rsvps IS 'Shows all RSVPs with their validity status based on guest activity and event access';
COMMENT ON VIEW public.rsvp_summary IS 'Provides a summary of valid RSVPs by event, only including active guests with event access';
COMMENT ON VIEW public.detailed_rsvps IS 'Shows detailed RSVP information, only including active guests with event access';

-- Update all existing RSVPs to set their is_valid status correctly
UPDATE public.rsvps r
SET is_valid = (
  EXISTS (
    SELECT 1 FROM public.guests g
    WHERE g.id = r.guest_id AND g.is_active = TRUE
  ) AND EXISTS (
    SELECT 1 FROM public.guest_event_access gea
    WHERE gea.guest_id = r.guest_id AND gea.event_id = r.event_id
  )
); 