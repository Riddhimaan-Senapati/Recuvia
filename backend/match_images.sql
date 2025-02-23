create or replace function match_images(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  image_url text,
  similarity float
)
language sql stable
as $$
  select
    id,
    image_url,
    1 - (embedding <=> query_embedding) as similarity
  from images
  where (embedding <=> query_embedding) < (1 - match_threshold)
  order by embedding <=> query_embedding
  limit match_count;
$$;
