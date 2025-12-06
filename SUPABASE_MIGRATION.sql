-- Safely add category column to market_assets if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_assets' AND column_name = 'category') THEN
        ALTER TABLE public.market_assets ADD COLUMN category text check (category in ('currency', 'gold', 'crypto'));
    END IF;
END $$;

-- Safely add market_watchlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.market_watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  category text check (category in ('currency', 'gold', 'crypto')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, symbol)
);

-- Enable RLS on market_watchlist (idempotent)
ALTER TABLE public.market_watchlist ENABLE ROW LEVEL SECURITY;

-- Safely create policies for market_watchlist only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_watchlist' AND policyname = 'Users can view their own watchlist') THEN
        CREATE POLICY "Users can view their own watchlist" ON public.market_watchlist FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_watchlist' AND policyname = 'Users can insert their own watchlist') THEN
        CREATE POLICY "Users can insert their own watchlist" ON public.market_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'market_watchlist' AND policyname = 'Users can delete their own watchlist') THEN
        CREATE POLICY "Users can delete their own watchlist" ON public.market_watchlist FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
