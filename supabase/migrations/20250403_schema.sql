-- Guests Table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the full_name column for faster lookups
CREATE INDEX IF NOT EXISTS guests_full_name_idx ON guests (full_name);

-- Sessions Table
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Create an index on session_token for faster lookups
  CONSTRAINT guest_sessions_session_token_key UNIQUE (session_token)
);

-- Create an index on the expires_at column to quickly filter expired sessions
CREATE INDEX IF NOT EXISTS guest_sessions_expires_at_idx ON guest_sessions (expires_at);

-- Create an index on the guest_id column for faster joins
CREATE INDEX IF NOT EXISTS guest_sessions_guest_id_idx ON guest_sessions (guest_id);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the updated_at trigger to the guests table
CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- RLS Policies for Security

-- Enable Row Level Security
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for guests table
CREATE POLICY "Public guests are viewable by everyone" 
ON guests FOR SELECT USING (true);

CREATE POLICY "Guests can be inserted by authenticated users" 
ON guests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Guests can be updated by authenticated users" 
ON guests FOR UPDATE TO authenticated USING (true);

-- Create policies for guest_sessions table
CREATE POLICY "Sessions are viewable by authenticated users" 
ON guest_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sessions can be inserted by authenticated users" 
ON guest_sessions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Sessions can be deleted by authenticated users" 
ON guest_sessions FOR DELETE TO authenticated USING (true);

-- Add some comments for documentation
COMMENT ON TABLE guests IS 'Stores wedding guest information';
COMMENT ON TABLE guest_sessions IS 'Stores guest authentication sessions';
COMMENT ON COLUMN guests.full_name IS 'The full name of the guest as it appears on their invitation';
COMMENT ON COLUMN guests.is_active IS 'Whether the guest is currently active in the system';
COMMENT ON COLUMN guest_sessions.session_token IS 'The unique token used for guest authentication';
COMMENT ON COLUMN guest_sessions.expires_at IS 'When the session token will expire'; 