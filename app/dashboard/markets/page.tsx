'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Search, RefreshCw, Eye, DollarSign, Coins, PieChart } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

import AssetRow from '@/components/markets/AssetRow';
import MarketItemRow from '@/components/markets/MarketItemRow';
import { allAssetOptions, marketItemConfig, AssetCategory } from '@/lib/constants/markets';

// Dynamic imports for heavy components
const PortfolioChart = dynamic(() => import('@/components/markets/PortfolioChart'), {
  loading: () => <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">Grafik yükleniyor...</div>,
  ssr: false
});

const AssetModal = dynamic(() => import('@/components/markets/AssetModal'), {
  ssr: false
});

interface Asset {
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

interface MarketItem {
  code: string;
  name: string;
  buying: number;
  selling: number;
  change: number;
}

interface CryptoItem {
  code: string;
  name: string;
  priceUSD: number;
  priceTRY: number;
  change: number;
}

interface MarketData {
  currencies: MarketItem[];
  golds: MarketItem[];
  cryptos?: CryptoItem[];
}

export default function MarketsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  // isLoading removed as it wasn't used effectively
  const [activeTab, setActiveTab] = useState<'watchlist' | 'portfolio' | 'currencies' | 'golds' | 'crypto'>('watchlist');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  // watchlistLoading removed as unused

  const supabase = createBrowserClient();
  const router = useRouter();

  // Load watchlist
  const loadWatchlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cache check could be added here
      const { data, error } = await supabase
        .from('market_watchlist')
        .select('symbol')
        .eq('user_id', user.id);

      if (error) {
        console.error('Watchlist load error:', error);
        return;
      }

      if (data) {
        setWatchlist(data.map(item => item.symbol));
      }
    } catch (e) {
      console.error('Watchlist load error:', e);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Toggle watchlist
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
        .insert({
          user_id: user.id,
          symbol: symbol,
          category: category,
        });

      if (error) {
        toast.error('Takibe eklenemedi');
        return;
      }

      setWatchlist(prev => [...prev, symbol]);
      toast.success('Takibe eklendi');
    }
  };

  // Get items for watchlist
  const getWatchlistItems = useMemo(() => {
    if (!marketData) return [];
    
    const items: { code: string; name: string; buying: number; selling: number; change: number; category: 'currency' | 'gold' | 'crypto'; icon: string; color: string }[] = [];
    
    watchlist.forEach(symbol => {
      // Check currencies
      const currency = marketData.currencies.find(c => c.code === symbol);
      if (currency) {
        const config = allAssetOptions.find(a => a.symbol === symbol);
        items.push({
          ...currency,
          category: 'currency',
          icon: config?.icon || '$',
          color: config?.color || '#22C55E',
        });
        return;
      }
      
      // Check golds
      const gold = marketData.golds.find(g => g.code === symbol);
      if (gold) {
        const config = allAssetOptions.find(a => a.symbol === symbol);
        items.push({
          ...gold,
          category: 'gold',
          icon: config?.icon || '◉',
          color: config?.color || '#F59E0B',
        });
        return;
      }
      
      // Check cryptos
      if (marketData.cryptos) {
        const crypto = marketData.cryptos.find(c => c.code === symbol);
        if (crypto) {
          const config = allAssetOptions.find(a => a.symbol === symbol);
          items.push({
            code: crypto.code,
            name: crypto.name,
            buying: crypto.priceTRY,
            selling: crypto.priceTRY,
            change: crypto.change,
            category: 'crypto',
            icon: config?.icon || '₿',
            color: config?.color || '#F7931A',
          });
        }
      }
    });
    
    return items;
  }, [watchlist, marketData]);

  // Fetch real market data
  const fetchMarketData = async () => {
    try {
      // Check local storage cache first
      const cachedData = localStorage.getItem('market_data_cache');
      const cachedTime = localStorage.getItem('market_data_time');
      
      if (cachedData && cachedTime && Date.now() - parseInt(cachedTime) < 60000) { // 1 min cache
         setMarketData(JSON.parse(cachedData));
         setIsMarketLoading(false);
         // Fetch fresh in background if needed, or just return
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
  };

  // Load assets
  useEffect(() => {
    const loadAssets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('market_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAssets(data.map(item => ({
          ...item,
          chartData: Array.from({ length: 30 }, (_, i) => ({ 
            value: item.price * (0.9 + Math.random() * 0.2) 
          }))
        })));
      }
    };

    loadAssets();
    fetchMarketData();
  }, [supabase, router]);

  // Total value calculation
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
  }, [assets]);

  // 24h change calculation
  const totalChange = useMemo(() => {
    if (assets.length === 0) return 0;
    const totalWeight = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
    if (totalWeight === 0) return 0;
    return assets.reduce((sum, asset) => {
      const weight = (asset.amount * asset.price) / totalWeight;
      return sum + (asset.change24h * weight);
    }, 0);
  }, [assets]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.symbol.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Filter cryptos for market view
  const filteredCryptos = useMemo(() => {
    if (!marketData?.cryptos) return [];
    if (!searchQuery) return marketData.cryptos;
    const query = searchQuery.toLowerCase();
    return marketData.cryptos.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    );
  }, [marketData, searchQuery]);

  // Save asset
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
          chartData: Array.from({ length: 30 }, (_, i) => ({ 
            value: data.price * (0.9 + Math.random() * 0.2) 
          }))
        }, ...prev]);
        toast.success('Varlık eklendi');
      }
    }
    setEditingAsset(null);
  };

  // Delete asset
  const handleDeleteAsset = async (id: string) => {
    const { error } = await supabase
      .from('market_assets')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Silme başarısız');
      return;
    }

    setAssets(prev => prev.filter(a => a.id !== id));
    toast.success('Varlık silindi');
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear cache to force refresh
    localStorage.removeItem('market_data_time');
    await fetchMarketData();
    setAssets(prev => prev.map(asset => ({
      ...asset,
      price: asset.price * (1 + (Math.random() - 0.5) * 0.02),
      change24h: asset.change24h + (Math.random() - 0.5) * 0.5,
      chartData: [...asset.chartData.slice(1), { value: asset.price * (1 + (Math.random() - 0.5) * 0.05) }]
    })));
    setIsRefreshing(false);
    toast.success('Veriler güncellendi');
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 animate-fadeIn">
      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[95%] h-[85vh] flex flex-col rounded-3xl backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/40 light:bg-white/90 light:shadow-xl overflow-hidden"
      >
        {/* Top Section - 35% */}
        <div className="h-[35%] p-8 border-b border-white/5 dark:border-white/5 light:border-zinc-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white dark:text-white light:text-zinc-900">Piyasalar</h1>
              <p className="text-sm text-white/60 dark:text-white/60 light:text-zinc-500 mt-1">Döviz, Altın & Kripto</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => { setEditingAsset(null); setIsModalOpen(true); setActiveTab('portfolio'); }}
                className="bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white hover:bg-zinc-200 dark:hover:bg-zinc-200 light:hover:bg-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
              >
                <Plus size={16} />
                Varlık Ekle
              </button>
            </div>
          </div>

          {/* Summary & Chart */}
          <div className="flex-1 flex gap-8">
            <div className="flex flex-col justify-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500 mb-2">Portföy Değeri</p>
              <p className="text-4xl font-bold text-white dark:text-white light:text-zinc-900 mb-2">
                ₺{totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-2 ${totalChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                <span className="text-lg font-semibold">
                  {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%
                </span>
                <span className="text-sm text-zinc-500 ml-1">24s</span>
              </div>
            </div>

            <div className="flex-1 h-full">
              <PortfolioChart assets={assets} />
            </div>
          </div>
        </div>

        {/* Bottom Section - 65% */}
        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 p-1 bg-white/5 dark:bg-white/5 light:bg-zinc-100 rounded-xl">
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'watchlist' 
                    ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                    : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
                }`}
              >
                <Eye size={16} />
                Takip
                {watchlist.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-500">
                    {watchlist.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'portfolio' 
                    ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                    : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
                }`}
              >
                <PieChart size={16} />
                Portföy
              </button>
              <button
                onClick={() => setActiveTab('currencies')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'currencies' 
                    ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                    : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
                }`}
              >
                <DollarSign size={16} />
                Döviz
              </button>
              <button
                onClick={() => setActiveTab('golds')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'golds' 
                    ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                    : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
                }`}
              >
                <Coins size={16} />
                Altın
              </button>
              <button
                onClick={() => setActiveTab('crypto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'crypto' 
                    ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                    : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
                }`}
              >
                ₿ Kripto
              </button>
            </div>
            
            {(activeTab === 'crypto' || activeTab === 'portfolio') && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-white dark:text-white light:text-zinc-900 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-48"
                />
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none space-y-2">
            <AnimatePresence mode="wait">
              {/* Watchlist Tab */}
              {activeTab === 'watchlist' && (
                <motion.div
                  key="watchlist"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  {isMarketLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : getWatchlistItems.length > 0 ? (
                    getWatchlistItems.map((item) => (
                      <MarketItemRow 
                        key={item.code} 
                        item={item} 
                        config={{ icon: item.icon, color: item.color, category: item.category }} 
                        isInWatchlist={true}
                        onToggleWatchlist={() => toggleWatchlist(item.code, item.category)}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Eye size={48} className="text-zinc-500 mb-4" />
                      <p className="text-zinc-400 mb-2">Takip listesi boş</p>
                      <p className="text-sm text-zinc-500">Döviz, Altın veya Kripto sekmelerinden<br />varlıkları takip listesine ekleyebilirsiniz</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Currencies Tab */}
              {activeTab === 'currencies' && (
                <motion.div
                  key="currencies"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  {isMarketLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : marketData?.currencies && marketData.currencies.length > 0 ? (
                    marketData.currencies.map((item) => (
                      <MarketItemRow 
                        key={item.code} 
                        item={item} 
                        config={marketItemConfig[item.code] || { icon: '$', color: '#22C55E', category: 'currency' }} 
                        isInWatchlist={watchlist.includes(item.code)}
                        onToggleWatchlist={() => toggleWatchlist(item.code, 'currency')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <DollarSign size={48} className="text-zinc-500 mb-4" />
                      <p className="text-zinc-400">Döviz verisi bulunamadı</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Gold Tab */}
              {activeTab === 'golds' && (
                <motion.div
                  key="golds"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  {isMarketLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : marketData?.golds && marketData.golds.length > 0 ? (
                    marketData.golds.map((item) => (
                      <MarketItemRow 
                        key={item.code} 
                        item={item} 
                        config={marketItemConfig[item.code] || { icon: '◉', color: '#F59E0B', category: 'gold' }} 
                        isInWatchlist={watchlist.includes(item.code)}
                        onToggleWatchlist={() => toggleWatchlist(item.code, 'gold')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Coins size={48} className="text-zinc-500 mb-4" />
                      <p className="text-zinc-400">Altın verisi bulunamadı</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Portfolio Tab */}
              {activeTab === 'portfolio' && (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  {filteredAssets.length > 0 ? (
                    filteredAssets.map((asset) => (
                      <AssetRow 
                        key={asset.id} 
                        asset={asset} 
                        onEdit={handleEditAsset}
                        onDelete={handleDeleteAsset}
                        isInWatchlist={watchlist.includes(asset.symbol)}
                        onToggleWatchlist={() => toggleWatchlist(asset.symbol, asset.category || 'currency')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 flex items-center justify-center mb-4">
                        <PieChart size={32} className="text-zinc-500" />
                      </div>
                      <p className="text-lg font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                        {searchQuery ? 'Sonuç bulunamadı' : 'Henüz varlık eklenmedi'}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        {searchQuery ? 'Farklı bir arama deneyin' : 'Portföyünüze döviz, altın veya kripto ekleyin'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
                          className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center gap-2"
                        >
                          <Plus size={16} />
                          İlk Varlığını Ekle
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Crypto Tab */}
              {activeTab === 'crypto' && (
                <motion.div
                  key="crypto"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  {isMarketLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  ) : filteredCryptos.length > 0 ? (
                    filteredCryptos.map((item) => (
                      <MarketItemRow 
                        key={item.code} 
                        item={{
                          code: item.code,
                          name: item.name,
                          buying: item.priceTRY,
                          selling: item.priceTRY,
                          change: item.change
                        }} 
                        config={{ icon: '₿', color: '#F7931A', category: 'crypto' }} 
                        isInWatchlist={watchlist.includes(item.code)}
                        onToggleWatchlist={() => toggleWatchlist(item.code, 'crypto')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <TrendingUp size={48} className="text-zinc-500 mb-4" />
                      <p className="text-zinc-400">Kripto verisi bulunamadı</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AssetModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAsset(null); }}
        onSave={handleSaveAsset}
        editingAsset={editingAsset}
        marketData={marketData}
      />
    </div>
  );
}