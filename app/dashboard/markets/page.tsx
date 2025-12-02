'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Search, RefreshCw, Trash2, Pencil, X, Check, Coins, DollarSign, Star, Eye } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Tüm varlık seçenekleri (Döviz, Altın, Kripto)
type AssetCategory = 'currency' | 'gold' | 'crypto';

interface AssetOption {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  category: AssetCategory;
  unit?: string; // Birim (adet, gram, vs.)
}

const allAssetOptions: AssetOption[] = [
  // Dövizler
  { symbol: 'USD', name: 'Amerikan Doları', icon: '$', color: '#22C55E', category: 'currency', unit: 'adet' },
  { symbol: 'EUR', name: 'Euro', icon: '€', color: '#3B82F6', category: 'currency', unit: 'adet' },
  { symbol: 'GBP', name: 'İngiliz Sterlini', icon: '£', color: '#8B5CF6', category: 'currency', unit: 'adet' },
  { symbol: 'CHF', name: 'İsviçre Frangı', icon: '₣', color: '#EF4444', category: 'currency', unit: 'adet' },
  
  // Altınlar
  { symbol: 'GA', name: 'Gram Altın', icon: '◉', color: '#F59E0B', category: 'gold', unit: 'gram' },
  { symbol: 'C', name: 'Çeyrek Altın', icon: '◎', color: '#F59E0B', category: 'gold', unit: 'adet' },
  { symbol: 'Y', name: 'Yarım Altın', icon: '◐', color: '#F59E0B', category: 'gold', unit: 'adet' },
  { symbol: 'T', name: 'Tam Altın', icon: '●', color: '#F59E0B', category: 'gold', unit: 'adet' },
  { symbol: 'A', name: 'Ata Altın', icon: '◉', color: '#D97706', category: 'gold', unit: 'adet' },
  { symbol: 'R', name: 'Reşat Altın', icon: '◈', color: '#D97706', category: 'gold', unit: 'adet' },
  { symbol: 'H', name: 'Hamit Altın', icon: '◇', color: '#D97706', category: 'gold', unit: 'adet' },
  { symbol: '22A', name: '22 Ayar Bilezik', icon: '○', color: '#F59E0B', category: 'gold', unit: 'gram' },
  { symbol: 'GUMUS', name: 'Gümüş', icon: '◇', color: '#9CA3AF', category: 'gold', unit: 'gram' },
  
  // Kriptolar
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: '#F7931A', category: 'crypto', unit: 'adet' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627EEA', category: 'crypto', unit: 'adet' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: '#00FFA3', category: 'crypto', unit: 'adet' },
  { symbol: 'AVAX', name: 'Avalanche', icon: 'A', color: '#E84142', category: 'crypto', unit: 'adet' },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬡', color: '#2A5ADA', category: 'crypto', unit: 'adet' },
  { symbol: 'DOT', name: 'Polkadot', icon: '●', color: '#E6007A', category: 'crypto', unit: 'adet' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡', color: '#8247E5', category: 'crypto', unit: 'adet' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', color: '#0033AD', category: 'crypto', unit: 'adet' },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', color: '#23292F', category: 'crypto', unit: 'adet' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: '#C2A633', category: 'crypto', unit: 'adet' },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', color: '#FFA409', category: 'crypto', unit: 'adet' },
  { symbol: 'UNI', name: 'Uniswap', icon: '🦄', color: '#FF007A', category: 'crypto', unit: 'adet' },
];

// Döviz ve Altın için ikon/renk eşleştirmesi
const marketItemConfig: Record<string, { icon: string; color: string; category: 'currency' | 'gold' }> = {
  USD: { icon: '$', color: '#22C55E', category: 'currency' },
  EUR: { icon: '€', color: '#3B82F6', category: 'currency' },
  GBP: { icon: '£', color: '#8B5CF6', category: 'currency' },
  GA: { icon: '◉', color: '#F59E0B', category: 'gold' },
  C: { icon: '◎', color: '#F59E0B', category: 'gold' },
  Y: { icon: '◐', color: '#F59E0B', category: 'gold' },
  T: { icon: '●', color: '#F59E0B', category: 'gold' },
  A: { icon: '◉', color: '#D97706', category: 'gold' },
};

// Toplam portföy değeri için grafik verisi - varlıklara göre dinamik
const generateChartData = (assets: Asset[]) => {
  const totalValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
  if (totalValue === 0) {
    return Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: 0 }));
  }
  
  return Array.from({ length: 30 }, (_, i) => {
    const startMultiplier = 0.85 + Math.random() * 0.1;
    const dailyChange = (i / 30) * (1 - startMultiplier) + (Math.random() - 0.5) * 0.03;
    const dayValue = totalValue * (startMultiplier + dailyChange + (i * 0.005));
    return { day: i + 1, value: Math.max(0, dayValue) };
  });
};

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

interface AssetRowProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}

function AssetRow({ asset, onEdit, onDelete, isInWatchlist, onToggleWatchlist }: AssetRowProps) {
  const value = asset.amount * asset.price;
  const isPositive = asset.change24h >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-zinc-100 transition-all border border-transparent hover:border-white/10 dark:hover:border-white/10 light:hover:border-zinc-200"
    >
      {/* Watchlist Toggle */}
      {onToggleWatchlist && (
        <button
          onClick={onToggleWatchlist}
          className={`p-2 rounded-lg transition-all ${
            isInWatchlist 
              ? 'text-amber-500 bg-amber-500/10' 
              : 'text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100'
          }`}
          title={isInWatchlist ? 'Takipten çıkar' : 'Takibe ekle'}
        >
          <Star size={16} fill={isInWatchlist ? 'currentColor' : 'none'} />
        </button>
      )}
      
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
        style={{ backgroundColor: `${asset.color}20`, color: asset.color }}
      >
        {asset.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white dark:text-white light:text-zinc-900 truncate">{asset.name}</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500">{asset.symbol}</p>
      </div>

      <div className="w-24 h-10 hidden sm:block">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={asset.chartData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={isPositive ? '#10b981' : '#ef4444'} 
              strokeWidth={1.5} 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-right min-w-[80px] hidden md:block">
        <p className="font-medium text-white dark:text-white light:text-zinc-900">{asset.amount}</p>
        <p className="text-xs text-zinc-500">{asset.symbol}</p>
      </div>

      <div className="text-right min-w-[100px]">
        <p className="font-semibold text-white dark:text-white light:text-zinc-900">
          ₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(asset)}
          className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 transition-all"
          title="Düzenle"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onDelete(asset.id)}
          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
          title="Sil"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// Market Item Row (Döviz/Altın için - sadece görüntüleme)
function MarketItemRow({ item, config, isInWatchlist, onToggleWatchlist }: { 
  item: MarketItem; 
  config: typeof marketItemConfig[string];
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}) {
  const isPositive = item.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-zinc-100 transition-all border border-transparent hover:border-white/10 dark:hover:border-white/10 light:hover:border-zinc-200"
    >
      {/* Watchlist Toggle */}
      {onToggleWatchlist && (
        <button
          onClick={onToggleWatchlist}
          className={`p-2 rounded-lg transition-all ${
            isInWatchlist 
              ? 'text-amber-500 bg-amber-500/10' 
              : 'text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100'
          }`}
          title={isInWatchlist ? 'Takipten çıkar' : 'Takibe ekle'}
        >
          <Star size={16} fill={isInWatchlist ? 'currentColor' : 'none'} />
        </button>
      )}
      
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white dark:text-white light:text-zinc-900 truncate">{item.name}</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500">{item.code}</p>
      </div>

      <div className="text-right min-w-[100px]">
        <p className="text-xs text-zinc-500 mb-1">Alış</p>
        <p className="font-medium text-white dark:text-white light:text-zinc-900">
          ₺{item.buying.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="text-right min-w-[100px]">
        <p className="text-xs text-zinc-500 mb-1">Satış</p>
        <p className="font-medium text-white dark:text-white light:text-zinc-900">
          ₺{item.selling.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="text-right min-w-[80px]">
        <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{item.change.toFixed(2)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

// Varlık Ekleme/Düzenleme Modal
interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Omit<Asset, 'id' | 'chartData'> & { id?: string; category?: AssetCategory }) => void;
  editingAsset?: Asset | null;
  marketData?: MarketData | null;
}

function AssetModal({ isOpen, onClose, onSave, editingAsset, marketData }: AssetModalProps) {
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
        const found = marketData.currencies.find(c => c.code === selectedAsset.symbol);
        if (found) currentPrice = found.selling;
      } else if (selectedAsset.category === 'gold') {
        const found = marketData.golds.find(g => g.code === selectedAsset.symbol);
        if (found) currentPrice = found.selling;
      } else if (selectedAsset.category === 'crypto' && marketData.cryptos) {
        const found = marketData.cryptos.find(c => c.code === selectedAsset.symbol);
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
          className="w-full max-w-md bg-zinc-900 dark:bg-zinc-900 light:bg-white rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white dark:text-white light:text-zinc-900">
              {editingAsset ? 'Varlığı Düzenle' : 'Yeni Varlık Ekle'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Kategori Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Varlık Türü</label>
            <div className="flex gap-2 p-1 bg-white/5 dark:bg-white/5 light:bg-zinc-100 rounded-xl">
              {(['currency', 'gold', 'crypto'] as AssetCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedCategory === cat 
                      ? 'bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white shadow' 
                      : 'text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-zinc-900'
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
            <label className="block text-sm font-medium text-zinc-400 mb-2">{getCategoryLabel(selectedCategory)} Seçin</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-white dark:text-white light:text-zinc-900 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500/50"
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
                      : 'bg-white/5 hover:bg-white/10 border-transparent'
                  } border`}
                >
                  <span style={{ color: asset.color }} className="text-lg">{asset.icon}</span>
                  <span className="text-xs text-zinc-400">{asset.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Seçili Varlık */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: `${selectedAsset.color}20`, color: selectedAsset.color }}
            >
              {selectedAsset.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white dark:text-white light:text-zinc-900">{selectedAsset.name}</p>
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
                      price = marketData.currencies.find(c => c.code === selectedAsset.symbol)?.selling;
                    } else if (selectedAsset.category === 'gold') {
                      price = marketData.golds.find(g => g.code === selectedAsset.symbol)?.selling;
                    } else if (selectedAsset.category === 'crypto' && marketData.cryptos) {
                      price = marketData.cryptos.find(c => c.code === selectedAsset.symbol)?.priceTRY;
                    }
                    return price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '-';
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* Miktar */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-400 mb-2">{getAmountLabel()}</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-white dark:text-white light:text-zinc-900 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Alış Fiyatı */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Alış Fiyatı (₺)</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 text-white dark:text-white light:text-zinc-900 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
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
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-medium transition-colors"
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

export default function MarketsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'currencies' | 'golds' | 'crypto'>('watchlist');
  const [watchlist, setWatchlist] = useState<string[]>([]); // Takip listesi (symbol kodları)
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const supabase = createBrowserClient();
  const router = useRouter();

  // Watchlist'i Supabase'den yükle
  const loadWatchlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } finally {
      setWatchlistLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Watchlist'e ekle/çıkar (Supabase)
  const toggleWatchlist = async (symbol: string, category: 'currency' | 'gold' | 'crypto' = 'currency') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isInList = watchlist.includes(symbol);

    if (isInList) {
      // Listeden çıkar
      const { error } = await supabase
        .from('market_watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol);

      if (error) {
        console.error('Watchlist delete error:', error);
        toast.error('Takipten çıkarılamadı');
        return;
      }

      setWatchlist(prev => prev.filter(s => s !== symbol));
      toast.success('Takipten çıkarıldı');
    } else {
      // Listeye ekle
      const { error } = await supabase
        .from('market_watchlist')
        .insert({
          user_id: user.id,
          symbol: symbol,
          category: category,
        });

      if (error) {
        console.error('Watchlist insert error:', error);
        toast.error('Takibe eklenemedi');
        return;
      }

      setWatchlist(prev => [...prev, symbol]);
      toast.success('Takibe eklendi');
    }
  };

  // Watchlist'teki varlıkları getir
  const getWatchlistItems = useMemo(() => {
    if (!marketData) return [];
    
    const items: { code: string; name: string; buying: number; selling: number; change: number; category: 'currency' | 'gold' | 'crypto'; icon: string; color: string }[] = [];
    
    watchlist.forEach(symbol => {
      // Dövizlerde ara
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
      
      // Altınlarda ara
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
      
      // Kriptolarda ara
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

  // Gerçek piyasa verilerini çek
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/markets');
      const result = await response.json();
      
      if (result.success && result.data) {
        setMarketData(result.data);
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

  // Varlıkları yükle
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
      setIsLoading(false);
    };

    loadAssets();
    fetchMarketData();
  }, [supabase, router]);

  // Toplam değer hesaplama
  const totalValue = useMemo(() => {
    return assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
  }, [assets]);

  // 24s toplam değişim (ağırlıklı ortalama)
  const totalChange = useMemo(() => {
    if (assets.length === 0) return 0;
    const totalWeight = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
    if (totalWeight === 0) return 0;
    const weightedChange = assets.reduce((sum, asset) => {
      const weight = (asset.amount * asset.price) / totalWeight;
      return sum + (asset.change24h * weight);
    }, 0);
    return weightedChange;
  }, [assets]);

  // Portföy grafik verisi - varlıklara göre dinamik
  const portfolioChartData = useMemo(() => {
    return generateChartData(assets);
  }, [assets]);

  // Arama filtresi
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(a => 
      a.name.toLowerCase().includes(query) || 
      a.symbol.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Varlık kaydet (ekle/güncelle)
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

  // Varlık sil
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

  // Düzenleme modalını aç
  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  // Yenileme
  const handleRefresh = async () => {
    setIsRefreshing(true);
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

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6 animate-fadeIn">
      {/* ANA KAPLAYICI - Cam Kutu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[95%] h-[85vh] flex flex-col rounded-3xl backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/40 light:bg-white/90 light:shadow-xl overflow-hidden"
      >
        {/* ÜST KISIM - %35 */}
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
                onClick={() => { setEditingAsset(null); setIsModalOpen(true); setActiveTab('crypto'); }}
                className="bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white hover:bg-zinc-200 dark:hover:bg-zinc-200 light:hover:bg-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
              >
                <Plus size={16} />
                Varlık Ekle
              </button>
            </div>
          </div>

          {/* Özet & Grafik */}
          <div className="flex-1 flex gap-8">
            {/* Sol - Özet */}
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

            {/* Sağ - Grafik */}
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolioChartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, 'Değer']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    dot={false}
                    fill="url(#colorValue)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ALT KISIM - %65 */}
        <div className="flex-1 flex flex-col p-8 overflow-hidden">
          {/* Tab Switcher */}
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
            
            {/* Arama - Sadece kripto için */}
            {activeTab === 'crypto' && (
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

          {/* İçerik */}
          <div className="flex-1 overflow-y-auto scrollbar-none space-y-2">
            <AnimatePresence mode="wait">
              {/* Takip Listesi Tab */}
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
                      <motion.div
                        key={item.code}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-transparent hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-zinc-100 transition-all border border-transparent hover:border-white/10 dark:hover:border-white/10 light:hover:border-zinc-200"
                      >
                        <div className="flex items-center gap-4">
                          {/* İkon */}
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                            style={{ backgroundColor: `${item.color}20`, color: item.color }}
                          >
                            {item.icon}
                          </div>
                          
                          {/* İsim */}
                          <div>
                            <p className="font-semibold text-white dark:text-white light:text-zinc-900">{item.name}</p>
                            <p className="text-sm text-zinc-500">{item.code}</p>
                          </div>
                        </div>
                        
                        {/* Fiyat & Değişim */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-zinc-500">Alış</p>
                            <p className="font-medium text-white dark:text-white light:text-zinc-900">
                              ₺{item.buying.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-zinc-500">Satış</p>
                            <p className="font-medium text-white dark:text-white light:text-zinc-900">
                              ₺{item.selling.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                            item.change >= 0 
                              ? 'bg-emerald-500/10 text-emerald-500' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span className="text-sm font-medium">
                              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                            </span>
                          </div>
                          
                          {/* Çıkar butonu */}
                          <button
                            onClick={() => toggleWatchlist(item.code, item.category)}
                            className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Takipten çıkar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
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

              {/* Döviz Tab */}
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

              {/* Altın Tab */}
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

              {/* Kripto Tab */}
              {activeTab === 'crypto' && (
                <motion.div
                  key="crypto"
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
                        onToggleWatchlist={() => toggleWatchlist(asset.symbol, 'crypto')}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 flex items-center justify-center mb-4">
                        <TrendingUp size={32} className="text-zinc-500" />
                      </div>
                      <p className="text-lg font-medium text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                        {searchQuery ? 'Sonuç bulunamadı' : 'Henüz kripto varlık eklenmedi'}
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        {searchQuery ? 'Farklı bir arama deneyin' : 'Portföyünüze kripto varlıklar ekleyin'}
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
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Varlık Ekleme/Düzenleme Modal */}
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
