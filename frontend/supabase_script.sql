-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create items table with vector support
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  url TEXT NOT NULL,
  submitter_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(512) NOT NULL,
  blur_hash TEXT DEFAULT '',
  ratio FLOAT DEFAULT 1.0
);

-- Create index for faster vector search
CREATE INDEX IF NOT EXISTS items_embedding_idx ON items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_items(
  query_embedding VECTOR(512),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  location TEXT,
  url TEXT,
  submitter_id UUID,
  created_at TIMESTAMPTZ,
  blur_hash TEXT,
  ratio FLOAT,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.title,
    items.description,
    items.location,
    items.url,
    items.submitter_id,
    items.created_at,
    items.blur_hash,
    items.ratio,
    1 - (items.embedding <=> query_embedding) AS score
  FROM items
  WHERE 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Set up RLS (Row Level Security) policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Allow all users to view items
CREATE POLICY "Anyone can view items" ON items
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own items
CREATE POLICY "Authenticated users can insert their own items" ON items
  FOR INSERT TO authenticated
  WITH CHECK ( submitter_id = auth.uid() ); -- Ensures the submitter_id matches the user inserting the row

-- Allow users to delete only their own items
CREATE POLICY "Users can delete their own items" ON items
  FOR DELETE TO authenticated -- Apply to logged-in users
  USING ( submitter_id = auth.uid() ); -- Allow delete ONLY IF the row's submitter_id matches the current user's ID

-- create view to allow users to see the submitter's emails
create or replace view public.items_with_email as
select
  i.*,
  u.email as submitter_email
from
  items i
  join auth.users u on i.submitter_id = u.id;