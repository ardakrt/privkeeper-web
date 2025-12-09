"use client";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, Coins, PieChart, Star, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Asset, useMarketData } from '@/hooks/useMarketData';
import { marketItemConfig } from '@/lib/constants/markets';
import AssetModal from '@/components/markets/AssetModal';

interface MarketsMobileViewProps {
  data: ReturnType<typeof useMarketData>;
}

export default function MarketsMobileView({ data }: MarketsMobileViewProps) {
  const { assets, marketData, watchlist, toggleWatchlist, handleSaveAsset, handleDeleteAsset } = data;
  
  const [activeTab, setActiveTab] = useState<'watchlist' | 'portfolio' | 'market'>('market');
  const [marketSubTab, setMarketSubTab] = useState<'currency' | 'gold' | 'crypto'>('currency');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [currency] = useState<'TRY' | 'USD'>('TRY');

  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
  }, [assets]);

  const totalChange = useMemo(() => {
    if (assets.length === 0) return 0;
    const totalWeight = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
    if (totalWeight === 0) return 0;
    return assets.reduce((sum, asset) => {
      const weight = (asset.amount * asset.price) / totalWeight;
      return sum + (asset.change24h * weight);
    }, 0);
  }, [assets]);

  // Market Items Filtering
  const getMarketItems = useMemo(() => {
    if (!marketData) return [];
    
    if (activeTab === 'watchlist') {
      const items: any[] = [];
      watchlist.forEach(symbol => {
        const curr = marketData.currencies.find(c => c.code === symbol);
        if (curr) { items.push({ ...curr, ...marketItemConfig[symbol], category: 'currency' }); return; }
        
        const gold = marketData.golds.find(g => g.code === symbol);
        if (gold) { items.push({ ...gold, ...marketItemConfig[symbol], category: 'gold' }); return; }
        
        const crypto = marketData.cryptos?.find(c => c.code === symbol);
        if (crypto) {
           items.push({
             code: crypto.code, name: crypto.name,
             buying: crypto.priceUSD, selling: crypto.priceUSD,
             change: crypto.change,
             ...marketItemConfig[symbol],
             category: 'crypto'
           });
        }
      });
      return items;
    }

    if (activeTab === 'market') {
      if (marketSubTab === 'currency') return marketData.currencies.map(c => ({ ...c, ...marketItemConfig[c.code], category: 'currency' }));
      if (marketSubTab === 'gold') return marketData.golds.map(g => ({ ...g, ...marketItemConfig[g.code], category: 'gold' }));
      if (marketSubTab === 'crypto') return marketData.cryptos?.map(c => ({
        code: c.code, name: c.name,
        buying: c.priceUSD,
        selling: c.priceUSD,
        change: c.change,
        icon: '₿', color: '#F7931A',
        category: 'crypto'
      })) || [];
    }

    return [];
  }, [marketData, activeTab, marketSubTab, watchlist]);

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-20">
      {/* Header & Portfolio Card */}
      <div className="p-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-emerald-500" />
            Piyasalar
          </h1>
          <button 
             onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
             className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-gray-900 dark:text-white border border-gray-200 dark:border-white/10"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Portfolio Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/10 p-6 shadow-xl">
          <div className="relative z-10">
            <p className="text-gray-500 dark:text-white/60 text-sm font-medium mb-1">Toplam Varlık</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              ₺{totalValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium backdrop-blur-md border border-white/5 ${totalChange >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                {totalChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                {Math.abs(totalChange).toFixed(2)}%
              </div>
              <span className="text-gray-400 dark:text-white/40 text-xs">Son 24 saat</span>
            </div>
          </div>
          
          {/* Decorative Circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        {/* Main Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-black/20 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-xl">
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'market' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50'}`}
          >
            Piyasa
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'portfolio' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50'}`}
          >
            Portföyüm
          </button>
          <button 
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'watchlist' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50'}`}
          >
            Takip
          </button>
        </div>

        {/* Sub Tabs (Only for Market) */}
        {activeTab === 'market' && (
          <div className="flex justify-between items-center gap-2 pb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {[
                { id: 'currency', label: 'Döviz', icon: DollarSign },
                { id: 'gold', label: 'Altın', icon: Coins },
                { id: 'crypto', label: 'Kripto', icon: PieChart }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMarketSubTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap backdrop-blur-md ${
                    marketSubTab === tab.id 
                      ? 'bg-gray-900 text-white border-transparent dark:bg-white dark:text-black dark:border-white' 
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/10 dark:hover:bg-white/10'
                  }`}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 space-y-3">
        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' ? (
             assets.length > 0 ? (
               assets.map((asset, i) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setEditingAsset(asset); setIsModalOpen(true); }}
                  className="flex items-center justify-between p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-2xl active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner" style={{ backgroundColor: `${asset.color}20`, color: asset.color }}>
                      {asset.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{asset.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-white/50">{asset.amount} {asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white">₺{(asset.amount * asset.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs ${asset.change24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </p>
                  </div>
                </motion.div>
               ))
             ) : (
                <div className="text-center py-10 text-gray-400 dark:text-white/40">
                  <p>Henüz varlık eklenmedi.</p>
                  <button onClick={() => setIsModalOpen(true)} className="mt-4 text-emerald-500 font-medium">İlk varlığını ekle</button>
                </div>
             )
          ) : (
            // Market & Watchlist Items
            getMarketItems.length > 0 ? (
              getMarketItems.map((item, i) => (
                <motion.div
                  key={item.code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/5 rounded-2xl mb-2 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-inner" style={{ color: item.color }}>
                      {item.icon || (item.category === 'currency' ? '$' : item.category === 'gold' ? '◉' : '₿')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.code}</h3>
                      <p className="text-xs text-gray-500 dark:text-white/50 truncate max-w-[100px]">{item.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.category === 'crypto' ? '$' : '₺'}
                        {item.selling.toLocaleString(item.category === 'crypto' ? 'en-US' : 'tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </p>
                    </div>
                    <button 
                      onClick={() => toggleWatchlist(item.code, item.category)}
                      className={`p-2 rounded-full ${watchlist.includes(item.code) ? 'text-amber-400 bg-amber-400/10' : 'text-gray-300 dark:text-white/20'}`}
                    >
                      <Star size={16} fill={watchlist.includes(item.code) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : activeTab === 'watchlist' ? (
              <div className="text-center py-10 text-gray-400 dark:text-white/40">
                <p>Henüz takibe alınmış döviz, altın veya kripto yok.</p>
              </div>
            ) : null
          )}
        </AnimatePresence>
        <div className="h-20" /> {/* Bottom spacer */}
      </div>

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