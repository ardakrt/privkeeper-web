'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';

interface MarketItem {
  code: string;
  name: string;
  buying: number;
  selling: number;
  change: number;
}

interface MarketItemRowProps {
  item: MarketItem;
  config: { icon: string; color: string; category: 'currency' | 'gold' | 'crypto' };
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  currency?: 'TRY' | 'USD';
}

export default function MarketItemRow({ item, config, isInWatchlist, onToggleWatchlist, currency = 'TRY' }: MarketItemRowProps) {
  const isPositive = item.change >= 0;

  const formatPrice = (price: number) => {
    return currency === 'TRY' 
      ? `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
          {formatPrice(item.buying)}
        </p>
      </div>

      <div className="text-right min-w-[100px]">
        <p className="text-xs text-zinc-500 mb-1">Satış</p>
        <p className="font-medium text-white dark:text-white light:text-zinc-900">
          {formatPrice(item.selling)}
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
