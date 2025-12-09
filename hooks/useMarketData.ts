import { createBrowserClient } from '@/lib/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  change24h: number;
  icon: string;
  color: string;
  category?: 'currency' | 'gold' | 'crypto';
  chartData: { value: number }[];
}

export interface MarketItem {
  code: string;
  name: string;
  buying: number;
  selling: number;
  change: number;
}

export interface CryptoItem {
  code: string;
  name: string;
  priceUSD: number;
  priceTRY: number;
  change: number;
}

export interface MarketData {
  currencies: MarketItem[];
  golds: MarketItem[];
  cryptos?: CryptoItem[];
}

export function useMarketData() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const supabase = createBrowserClient();

  const fetchMarketData = useCallback(async () => {
    try {
      const cachedData = localStorage.getItem('market_data_cache');
      const cachedTime = localStorage.getItem('market_data_time');
      
      if (cachedData && cachedTime && Date.now() - parseInt(cachedTime) < 60000) { 
         setMarketData(JSON.parse(cachedData));
         setIsMarketLoading(false);
         return; 
      }

      const response = await fetch('/api/markets');
      const result = await response.json();
      
      if (result.success && result.data) {
        setMarketData(result.data);
        localStorage.setItem('market_data_cache', JSON.stringify(result.data));
        localStorage.setItem('market_data_time', Date.now().toString());
      } else {
        console.error('Market API error:', result.error);
        toast.error('Piyasa verileri alınamadı');
      }
    } catch (error) {
      console.error('Market fetch error:', error);
      toast.error('Piyasa verileri alınamadı');
    } finally {
      setIsMarketLoading(false);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('market_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setAssets(data.map(item => ({
        ...item,
        chartData: Array.from({ length: 30 }, () => ({ 
          value: item.price * (0.9 + Math.random() * 0.2) 
        }))
      })));
    }
  }, [supabase]);

  const loadWatchlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('market_watchlist')
      .select('symbol')
      .eq('user_id', user.id);

    if (data) {
      setWatchlist(data.map(item => item.symbol));
    }
  }, [supabase]);

  const toggleWatchlist = async (symbol: string, category: 'currency' | 'gold' | 'crypto' = 'currency') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isInList = watchlist.includes(symbol);

    if (isInList) {
      const { error } = await supabase
        .from('market_watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);

      if (error) {
        toast.error('Takipten çıkarılamadı');
        return;
      }
      setWatchlist(prev => prev.filter(s => s !== symbol));
      toast.success('Takipten çıkarıldı');
    } else {
      const { error } = await supabase
        .from('market_watchlist')
        .insert({ user_id: user.id, symbol, category });

      if (error) {
        toast.error('Takibe eklenemedi');
        return;
      }
      setWatchlist(prev => [...prev, symbol]);
      toast.success('Takibe eklendi');
    }
  };

  const handleSaveAsset = async (assetData: Omit<Asset, 'id' | 'chartData'> & { id?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (assetData.id) {
      const { error } = await supabase
        .from('market_assets')
        .update({
          symbol: assetData.symbol,
          name: assetData.name,
          icon: assetData.icon,
          color: assetData.color,
          amount: assetData.amount,
          price: assetData.price,
          change24h: assetData.change24h,
          category: assetData.category,
        })
        .eq('id', assetData.id);

      if (error) {
        toast.error('Güncelleme başarısız');
        return;
      }

      setAssets(prev => prev.map(a => 
        a.id === assetData.id 
          ? { ...a, ...assetData, chartData: a.chartData }
          : a
      ));
      toast.success('Varlık güncellendi');
    } else {
      const { data, error } = await supabase
        .from('market_assets')
        .insert({
          user_id: user.id,
          symbol: assetData.symbol,
          name: assetData.name,
          icon: assetData.icon,
          color: assetData.color,
          amount: assetData.amount,
          price: assetData.price,
          change24h: assetData.change24h,
          category: assetData.category,
        })
        .select()
        .single();

      if (error) {
        toast.error('Ekleme başarısız');
        return;
      }

      if (data) {
        setAssets(prev => [{
          ...data,
          chartData: Array.from({ length: 30 }, () => ({ 
            value: data.price * (0.9 + Math.random() * 0.2) 
          }))
        }, ...prev]);
        toast.success('Varlık eklendi');
      }
    }
  };

  const handleDeleteAsset = async (id: string) => {
    const { error } = await supabase.from('market_assets').delete().eq('id', id);
    if (error) {
      toast.error('Silme başarısız');
      return;
    }
    setAssets(prev => prev.filter(a => a.id !== id));
    toast.success('Varlık silindi');
  };

  const refreshData = async () => {
    localStorage.removeItem('market_data_time');
    await fetchMarketData();
    // Simulate slight price variations for visual feedback
    setAssets(prev => prev.map(asset => ({
      ...asset,
      price: asset.price * (1 + (Math.random() - 0.5) * 0.02),
      change24h: asset.change24h + (Math.random() - 0.5) * 0.5
    })));
  };

  useEffect(() => {
    loadAssets();
    loadWatchlist();
    fetchMarketData();
  }, [loadAssets, loadWatchlist, fetchMarketData]);

  return {
    assets,
    marketData,
    isMarketLoading,
    watchlist,
    toggleWatchlist,
    handleSaveAsset,
    handleDeleteAsset,
    refreshData
  };
}
