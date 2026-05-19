create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  guest_name text not null,
  prompt_id text not null,
  prompt_title text not null,
  image_path text,
  image_url text not null,
  points integer not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists photos_event_slug_created_at_idx
  on public.photos (event_slug, created_at desc);

alter table public.photos enable row level security;

-- Enable real-time broadcasts for the photos table so all guests see updates instantly
alter publication supabase_realtime add table public.photos;

drop policy if exists "Public photos are readable" on public.photos;
create policy "Public photos are readable"
  on public.photos for select
  using (true);

drop policy if exists "Guests can add photos" on public.photos;
create policy "Guests can add photos"
  on public.photos for insert
  with check (
    length(guest_name) between 1 and 32
    and points between 0 and 30
    and event_slug = 'nisan'
  );

drop policy if exists "Guests can like photos" on public.photos;

create or replace function public.increment_photo_like(photo_id uuid)
returns table (
  id uuid,
  event_slug text,
  guest_name text,
  prompt_id text,
  prompt_title text,
  image_path text,
  image_url text,
  points integer,
  likes integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.photos
  set likes = public.photos.likes + 1
  where public.photos.id = photo_id
  returning
    public.photos.id,
    public.photos.event_slug,
    public.photos.guest_name,
    public.photos.prompt_id,
    public.photos.prompt_title,
    public.photos.image_path,
    public.photos.image_url,
    public.photos.points,
    public.photos.likes,
    public.photos.created_at;
end;
$$;

grant execute on function public.increment_photo_like(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', true, 2500000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Guests can upload memory photos" on storage.objects;
create policy "Guests can upload memory photos"
  on storage.objects for insert
  with check (
    bucket_id = 'memories'
    and (storage.foldername(name))[1] = 'nisan'
  );

drop policy if exists "Memory photos are public" on storage.objects;
create policy "Memory photos are public"
  on storage.objects for select
  using (bucket_id = 'memories');
