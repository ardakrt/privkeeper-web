'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, Coins, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { allAssetOptions, AssetCategory, AssetOption } from '@/lib/constants/markets';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  price: number;
  change24h: number;
  icon: string;
  color: string;
  chartData: { value: number }[];
}

interface MarketData {
  currencies: any[];
  golds: any[];
  cryptos?: any[];
}

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Omit<Asset, 'id' | 'chartData'> & { id?: string; category?: AssetCategory }) => void;
  editingAsset?: Asset | null;
  marketData?: MarketData | null;
}

export default function AssetModal({ isOpen, onClose, onSave, editingAsset, marketData }: AssetModalProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetOption>(allAssetOptions[0]);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('currency');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Kategoriye göre filtrelenmiş varlıklar
  const filteredAssets = allAssetOptions.filter(a => {
    const matchesCategory = a.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Seçilen varlık için güncel fiyatı otomatik doldur
  useEffect(() => {
    if (!editingAsset && marketData && selectedAsset) {
      let currentPrice = 0;
      
      if (selectedAsset.category === 'currency') {
        const found = marketData.currencies.find((c: any) => c.code === selectedAsset.symbol);
        if (found) currentPrice = found.selling;
      } else if (selectedAsset.category === 'gold') {
        const found = marketData.golds.find((g: any) => g.code === selectedAsset.symbol);
        if (found) currentPrice = found.selling;
      } else if (selectedAsset.category === 'crypto' && marketData.cryptos) {
        const found = marketData.cryptos.find((c: any) => c.code === selectedAsset.symbol);
        if (found) currentPrice = found.priceTRY;
      }
      
      if (currentPrice > 0) {
        setPrice(currentPrice.toString());
      }
    }
  }, [selectedAsset, marketData, editingAsset]);

  useEffect(() => {
    if (editingAsset) {
      const asset = allAssetOptions.find(a => a.symbol === editingAsset.symbol) || allAssetOptions[0];
      setSelectedAsset(asset);
      setSelectedCategory(asset.category);
      setAmount(editingAsset.amount.toString());
      setPrice(editingAsset.price.toString());
    } else {
      setSelectedAsset(allAssetOptions.find(a => a.category === selectedCategory) || allAssetOptions[0]);
      setAmount('');
      setPrice('');
    }
    setSearchQuery('');
  }, [editingAsset, isOpen]);

  // Kategori değiştiğinde ilk varlığı seç
  useEffect(() => {
    if (!editingAsset) {
      const firstInCategory = allAssetOptions.find(a => a.category === selectedCategory);
      if (firstInCategory) {
        setSelectedAsset(firstInCategory);
      }
    }
  }, [selectedCategory, editingAsset]);

  const handleSave = () => {
    if (!amount || !price) {
      toast.error('Miktar ve fiyat gerekli');
      return;
    }

    onSave({
      id: editingAsset?.id,
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      icon: selectedAsset.icon,
      color: selectedAsset.color,
      amount: parseFloat(amount),
      price: parseFloat(price),
      change24h: editingAsset?.change24h || (Math.random() - 0.5) * 10,
      category: selectedAsset.category,
    });
    onClose();
  };

  const getCategoryLabel = (cat: AssetCategory) => {
    switch (cat) {
      case 'currency': return 'Döviz';
      case 'gold': return 'Altın';
      case 'crypto': return 'Kripto';
    }
  };

  const getAmountLabel = () => {
    if (selectedAsset.symbol === 'GA') return 'Miktar (gram)';
    return 'Miktar (adet)';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-white/10 p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {editingAsset ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Kategori Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Varlık Türü</label>
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-xl">
              {(['currency', 'gold', 'crypto'] as AssetCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedCategory === cat 
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {cat === 'currency' && <DollarSign size={14} />}
                  {cat === 'gold' && <Coins size={14} />}
                  {cat === 'crypto' && <span>₿</span>}
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Varlık Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{getCategoryLabel(selectedCategory)} Seçin</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto scrollbar-none">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.symbol}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    selectedAsset.symbol === asset.symbol
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 border-transparent'
                  } border`}
                >
                  <span style={{ color: asset.color }} className="text-lg">{asset.icon}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{asset.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Seçili Varlık */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 dark:bg-white/5 mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: `${selectedAsset.color}20`, color: selectedAsset.color }}
            >
              {selectedAsset.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-white">{selectedAsset.name}</p>
              <p className="text-xs text-zinc-500">{selectedAsset.symbol} • {getCategoryLabel(selectedAsset.category)}</p>
            </div>
            {/* Güncel fiyat göster */}
            {marketData && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Güncel</p>
                <p className="text-sm font-medium text-emerald-500">
                  ₺{(() => {
                    let price: number | undefined;
                    if (selectedAsset.category === 'currency') {
                      price = marketData.currencies.find((c: any) => c.code === selectedAsset.symbol)?.selling;
                    } else if (selectedAsset.category === 'gold') {
                      price = marketData.golds.find((g: any) => g.code === selectedAsset.symbol)?.selling;
                    } else if (selectedAsset.category === 'crypto' && marketData.cryptos) {
                      price = marketData.cryptos.find((c: any) => c.code === selectedAsset.symbol)?.priceTRY;
                    }
                    return price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '-';
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* Miktar */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">{getAmountLabel()}</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Alış Fiyatı */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Alış Fiyatı (₺)</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
            {/* Toplam değer hesaplama */}
            {amount && price && (
              <p className="text-xs text-zinc-500 mt-2">
                Toplam: ₺{(parseFloat(amount) * parseFloat(price)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Butonlar */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {editingAsset ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}