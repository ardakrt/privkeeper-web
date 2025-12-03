-- Market Watchlist tablosu oluştur
CREATE TABLE IF NOT EXISTS market_watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('currency', 'gold', 'crypto')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Aynı kullanıcı aynı sembolü bir kez ekleyebilir
  UNIQUE(user_id, symbol)
);

-- RLS (Row Level Security) etkinleştir
ALTER TABLE market_watchlist ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi watchlist'lerini görebilir
CREATE POLICY "Users can view own watchlist" ON market_watchlist
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar kendi watchlist'lerine ekleyebilir
CREATE POLICY "Users can insert own watchlist" ON market_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi watchlist'lerinden silebilir
CREATE POLICY "Users can delete own watchlist" ON market_watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Index oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_market_watchlist_user_id ON market_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_market_watchlist_symbol ON market_watchlist(symbol);




