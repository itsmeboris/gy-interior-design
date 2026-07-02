-- Display data for the portfolio grid (publicly readable).
create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  ig_media_id text unique not null,
  permalink text not null,
  caption text,
  media_type text not null,
  storage_path text not null,
  dominant_color text,
  timestamp timestamptz not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.instagram_posts enable row level security;

-- Anyone may read posts; writes happen only via the service role (bypasses RLS).
create policy "Public can read instagram posts"
  on public.instagram_posts for select
  using (true);

-- Secrets: token + config. No public access at all.
create table if not exists public.instagram_config (
  id int primary key default 1,
  ig_user_id text,
  access_token text not null,
  token_expires_at timestamptz not null,
  constraint instagram_config_singleton check (id = 1)
);

alter table public.instagram_config enable row level security;
-- No policies -> anon/auth have no access. Service role bypasses RLS.

-- Public bucket for cached images (public read via public URLs).
insert into storage.buckets (id, name, public)
values ('instagram-media', 'instagram-media', true)
on conflict (id) do nothing;
