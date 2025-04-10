-- Create event_category enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_category') THEN
    CREATE TYPE event_category AS ENUM ('ceremony', 'reception', 'engagement', 'rehearsal', 'other');
  END IF;
END$$;

-- Create rsvp_response enum type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_response') THEN
    CREATE TYPE rsvp_response AS ENUM ('attending', 'not_attending', 'maybe');
  END IF;
END$$;

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_event_id UUID REFERENCES events(id),
  category event_category NOT NULL,
  date DATE,
  time_start TIME,
  time_end TIME,
  location TEXT,
  description TEXT,
  rsvp_deadline DATE,
  is_active BOOLEAN DEFAULT true,
  max_plus_ones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on event code for faster lookups
CREATE INDEX IF NOT EXISTS events_code_idx ON events (code);

-- Guest Event Access Table
CREATE TABLE IF NOT EXISTS guest_event_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  can_rsvp BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a guest can only have one access record per event
  CONSTRAINT guest_event_access_unique UNIQUE (guest_id, event_id)
);

-- Create indexes for faster access
CREATE INDEX IF NOT EXISTS guest_event_access_guest_id_idx ON guest_event_access (guest_id);
CREATE INDEX IF NOT EXISTS guest_event_access_event_id_idx ON guest_event_access (event_id);

-- RSVPs Table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  response rsvp_response NOT NULL,
  dietary_restrictions TEXT,
  has_plus_ones BOOLEAN DEFAULT false,
  plus_one_count TEXT,
  adult_count TEXT,
  children_count TEXT,
  notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a guest can only RSVP once per event
  CONSTRAINT rsvps_unique UNIQUE (guest_id, event_id)
);

-- Create indexes for faster access
CREATE INDEX IF NOT EXISTS rsvps_guest_id_idx ON rsvps (guest_id);
CREATE INDEX IF NOT EXISTS rsvps_event_id_idx ON rsvps (event_id);

-- Plus Ones Table
CREATE TABLE IF NOT EXISTS plus_ones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rsvp_id UUID NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  is_child BOOLEAN DEFAULT false,
  age TEXT,
  dietary_restrictions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS plus_ones_rsvp_id_idx ON plus_ones (rsvp_id);

-- Apply the updated_at trigger to all tables with updated_at columns
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at
BEFORE UPDATE ON rsvps
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_plus_ones_updated_at
BEFORE UPDATE ON plus_ones
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- RLS Policies for Security

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE plus_ones ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Events are viewable by everyone" 
ON events FOR SELECT USING (true);

CREATE POLICY "Events can be managed by authenticated users" 
ON events FOR ALL TO authenticated USING (true);

-- Create policies for guest_event_access table
CREATE POLICY "Guest event access viewable by everyone" 
ON guest_event_access FOR SELECT USING (true);

CREATE POLICY "Guest event access can be managed by authenticated users" 
ON guest_event_access FOR ALL TO authenticated USING (true);

-- Create policies for RSVPs table
CREATE POLICY "RSVPs are viewable by everyone" 
ON rsvps FOR SELECT USING (true);

CREATE POLICY "RSVPs can be managed by authenticated users" 
ON rsvps FOR ALL TO authenticated USING (true);

-- Create policies for plus_ones table
CREATE POLICY "Plus ones are viewable by everyone" 
ON plus_ones FOR SELECT USING (true);

CREATE POLICY "Plus ones can be managed by authenticated users" 
ON plus_ones FOR ALL TO authenticated USING (true);

-- Add some comments for documentation
COMMENT ON TABLE events IS 'Stores wedding events information';
COMMENT ON TABLE guest_event_access IS 'Tracks which events guests are invited to';
COMMENT ON TABLE rsvps IS 'Stores guest RSVPs for events';
COMMENT ON TABLE plus_ones IS 'Stores information about plus ones for RSVPs';

-- Add a column for invited_events to the guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS invited_events TEXT[] DEFAULT ARRAY['engagement', 'wedding', 'reception'];

-- Update existing guests to have all events by default
UPDATE guests SET invited_events = ARRAY['engagement', 'wedding', 'reception'] WHERE invited_events IS NULL; 