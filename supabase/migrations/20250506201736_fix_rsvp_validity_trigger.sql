-- Fix the trigger function to handle record access properly
CREATE OR REPLACE FUNCTION public.update_rsvp_validity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_valid flag for affected RSVPs
  IF TG_OP = 'DELETE' THEN
    -- Handle DELETE operations
    IF TG_TABLE_NAME = 'guests' THEN
      UPDATE public.rsvps
      SET is_valid = FALSE
      WHERE guest_id = OLD.id;
    ELSIF TG_TABLE_NAME = 'guest_event_access' THEN
      UPDATE public.rsvps
      SET is_valid = (
        EXISTS (
          SELECT 1 FROM public.guests g
          WHERE g.id = guest_id AND g.is_active = TRUE
        )
      )
      WHERE guest_id = OLD.guest_id AND event_id = OLD.event_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    -- Handle INSERT and UPDATE operations
    IF TG_TABLE_NAME = 'guests' THEN
      UPDATE public.rsvps
      SET is_valid = (NEW.is_active = TRUE AND EXISTS (
        SELECT 1 FROM public.guest_event_access gea
        WHERE gea.guest_id = guest_id AND gea.event_id = event_id
      ))
      WHERE guest_id = NEW.id;
    ELSIF TG_TABLE_NAME = 'guest_event_access' THEN
      UPDATE public.rsvps
      SET is_valid = (
        EXISTS (
          SELECT 1 FROM public.guests g
          WHERE g.id = guest_id AND g.is_active = TRUE
        )
      )
      WHERE guest_id = NEW.guest_id AND event_id = NEW.event_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the triggers
DROP TRIGGER IF EXISTS guests_rsvp_validity_trigger ON public.guests;
CREATE TRIGGER guests_rsvp_validity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.update_rsvp_validity();

DROP TRIGGER IF EXISTS guest_event_access_rsvp_validity_trigger ON public.guest_event_access;
CREATE TRIGGER guest_event_access_rsvp_validity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.guest_event_access
FOR EACH ROW EXECUTE FUNCTION public.update_rsvp_validity(); 