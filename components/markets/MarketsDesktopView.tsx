"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Search, RefreshCw, Eye, DollarSign, Coins, PieChart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMarketData } from '@/hooks/useMarketData';

import AssetRow from '@/components/markets/AssetRow';
import MarketItemRow from '@/components/markets/MarketItemRow';
import { marketItemConfig, allAssetOptions } from '@/lib/constants/markets';
import AssetModal from '@/components/markets/AssetModal';
import PortfolioChart from '@/components/markets/PortfolioChart';

interface MarketsDesktopViewProps {
  data: ReturnType<typeof useMarketData>;
}

export default function MarketsDesktopView({ data }: MarketsDesktopViewProps) {
  const { assets, marketData, isMarketLoading, watchlist, toggleWatchlist, handleSaveAsset, handleDeleteAsset, refreshData } = data;
  
  const [activeTab, setActiveTab] = useState<'watchlist' | 'portfolio' | 'currencies' | 'golds' | 'crypto'>('watchlist');
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any | null>(null);

  // Load currency preference
  useEffect(() => {
    const savedCurrency = localStorage.getItem('market_currency') as 'TRY' | 'USD';
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }
  }, []);

  const handleSetCurrency = (newCurrency: 'TRY' | 'USD') => {
    setCurrency(newCurrency);
    localStorage.setItem('market_currency', newCurrency);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

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

   // Get items for watchlist
  const getWatchlistItems = useMemo(() => {
    if (!marketData) return [];
    
    const items: any[] = [];
    
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

   // Filter assets
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.symbol.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Filter cryptos
  const filteredCryptos = useMemo(() => {
    if (!marketData?.cryptos) return [];
    
    // Always use USD for crypto display
    const cryptos = marketData.cryptos.map(c => ({
      ...c,
      priceTRY: c.priceUSD, // Force USD price into the field used for display if needed, or better:
      // actually map to the MarketItem structure expected by the row
    }));

    if (!searchQuery) return cryptos;
    const query = searchQuery.toLowerCase();
    return cryptos.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query)
    );
  }, [marketData, searchQuery]);

  return (
    <div className="w-full h-full flex items-center justify-center p-6 animate-fadeIn">
      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[95%] h-[85vh] flex flex-col rounded-3xl backdrop-blur-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-black/40 shadow-xl overflow-hidden"
      >
        {/* Top Section - 35% */}
        <div className="h-[35%] p-8 border-b border-zinc-200 dark:border-white/5 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Piyasalar</h1>
              <p className="text-sm text-zinc-500 dark:text-white/60 mt-1">Döviz, Altın & Kripto</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => { setEditingAsset(null); setIsModalOpen(true); setActiveTab('portfolio'); }}
                className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
              >
                <Plus size={16} />
                Varlık Ekle
              </button>
            </div>
          </div>

          {/* Summary & Chart */}
          <div className="flex-1 flex gap-8">
            <div className="flex flex-col justify-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Portföy Değeri</p>
              <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
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
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-xl">
              <button
                onClick={() => setActiveTab('watchlist')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'watchlist' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <PieChart size={16} />
                Portföy
              </button>
              <button
                onClick={() => setActiveTab('currencies')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'currencies' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <DollarSign size={16} />
                Döviz
              </button>
              <button
                onClick={() => setActiveTab('golds')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'golds' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <Coins size={16} />
                Altın
              </button>
              <button
                onClick={() => setActiveTab('crypto')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'crypto' 
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                ₿ Kripto
              </button>
            </div>
            
            {(activeTab === 'crypto' || activeTab === 'portfolio') && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-48"
                  />
                </div>
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
                        currency="TRY"
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
                        currency="TRY"
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
                        currency="TRY"
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
                        onEdit={(asset) => { setEditingAsset(asset); setIsModalOpen(true); }}
                        onDelete={handleDeleteAsset}
                        isInWatchlist={watchlist.includes(asset.symbol)}
                        onToggleWatchlist={() => toggleWatchlist(asset.symbol, asset.category || 'currency')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
                        <PieChart size={32} className="text-zinc-500" />
                      </div>
                      <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
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
                          buying: item.priceUSD,
                          selling: item.priceUSD,
                          change: item.change
                        }} 
                        config={{ icon: '₿', color: '#F7931A', category: 'crypto' }} 
                        isInWatchlist={watchlist.includes(item.code)}
                        onToggleWatchlist={() => toggleWatchlist(item.code, 'crypto')}
                        currency="USD"
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