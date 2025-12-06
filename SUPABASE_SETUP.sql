-- Create market_assets table if it doesn't exist
create table if not exists public.market_assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  icon text,
  color text,
  amount numeric not null,
  price numeric not null, -- Buy price or average cost
  change24h numeric default 0,
  category text check (category in ('currency', 'gold', 'crypto')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create market_watchlist table if it doesn't exist
create table if not exists public.market_watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  category text check (category in ('currency', 'gold', 'crypto')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, symbol)
);

-- Enable RLS
alter table public.market_assets enable row level security;
alter table public.market_watchlist enable row level security;

-- Policies for market_assets
create policy "Users can view their own assets"
  on public.market_assets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own assets"
  on public.market_assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assets"
  on public.market_assets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own assets"
  on public.market_assets for delete
  using (auth.uid() = user_id);

-- Policies for market_watchlist
create policy "Users can view their own watchlist"
  on public.market_watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist"
  on public.market_watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own watchlist"
  on public.market_watchlist for delete
  using (auth.uid() = user_id);
