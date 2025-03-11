-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create item_images table with vector column
CREATE TABLE IF NOT EXISTS public.item_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_vector VECTOR(1024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_images(
  query_embedding VECTOR(1024),
  similarity_threshold FLOAT,
  max_results INTEGER
)
RETURNS TABLE (
  id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    1 - (item_images.image_vector <=> query_embedding) AS similarity
  FROM
    items
  JOIN
    item_images ON items.id = item_images.item_id
  WHERE
    1 - (item_images.image_vector <=> query_embedding) > similarity_threshold
  ORDER BY
    similarity DESC
  LIMIT max_results;
END;
$$;

-- Row-level security policies
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read items and item_images
CREATE POLICY "Public can view items" 
ON items FOR SELECT USING (true);

CREATE POLICY "Public can view item images" 
ON item_images FOR SELECT USING (true);

CREATE POLICY "Public can view profiles" 
ON profiles FOR SELECT USING (true);

-- Allow authenticated users to insert their own items
CREATE POLICY "Users can insert items" 
ON items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to insert images for their items
CREATE POLICY "Users can insert item images" 
ON item_images FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM items WHERE 
    items.id = item_images.item_id AND 
    items.user_id = auth.uid()
  )
);

-- Create a trigger to sync user emails to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true);

-- Allow public access to images
CREATE POLICY "Public can view item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'item-images' AND
  auth.role() = 'authenticated'
);
