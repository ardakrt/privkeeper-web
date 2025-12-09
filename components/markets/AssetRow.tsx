'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Pencil, Trash2, Star } from 'lucide-react';
// We will import SparklineChart dynamically in the parent or just import it here if we accept the bundle size for now.
// To optimize, we should probably dynamic import this component in the parent list.
import SparklineChart from './SparklineChart';

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

interface AssetRowProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}

export default function AssetRow({ asset, onEdit, onDelete, isInWatchlist, onToggleWatchlist }: AssetRowProps) {
  const value = asset.amount * asset.price;
  const isPositive = asset.change24h >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-white/10"
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
        <p className="font-semibold text-zinc-900 dark:text-white truncate text-sm md:text-base">{asset.name}</p>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">{asset.symbol}</p>
      </div>

      <div className="w-24 h-10 hidden lg:block">
        <SparklineChart data={asset.chartData} isPositive={isPositive} />
      </div>

      <div className="text-right min-w-[80px] hidden sm:block">
        <p className="font-medium text-zinc-900 dark:text-white text-sm md:text-base">{asset.amount}</p>
        <p className="text-xs text-zinc-500">{asset.symbol}</p>
      </div>

      <div className="text-right min-w-[90px] md:min-w-[100px]">
        <p className="font-semibold text-zinc-900 dark:text-white text-sm md:text-base">
          ₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className={`flex items-center justify-end gap-1 text-xs md:text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={14} className="md:w-[14px] md:h-[14px]" /> : <TrendingDown size={14} className="md:w-[14px] md:h-[14px]" />}
          <span>{isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(asset)}
          className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 transition-all"
          title="Düzenle"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onDelete(asset.id)}
          className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
          title="Sil"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}