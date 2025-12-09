"use client";

import { SubscriptionWithComputed } from "@/types/finance";
import { Edit2, Trash2, CheckCircle2 } from "lucide-react";
import ServiceLogo from "@/components/finance/ServiceLogo";
import { getServiceInfo } from "@/lib/serviceIcons";

interface SubscriptionCardProps {
  item: SubscriptionWithComputed;
  onEdit?: (item: SubscriptionWithComputed) => void;
  onDelete?: () => void;
}

export default function SubscriptionCard({ item, onEdit, onDelete }: SubscriptionCardProps) {
  const isLoan = item.type === 'loan';
  const isCompleted = item.status === 'completed';

  const loanProgress = isLoan && item.total_installments
    ? ((item.paid_installments || 0) / item.total_installments) * 100
    : 0;

  const getBadgeStyles = () => {
    if (isCompleted) return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' };
    if (item.daysLeft <= 1) return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' };
    if (item.daysLeft <= 3) return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' };
    return { bg: 'bg-zinc-100 dark:bg-white/5', text: 'text-zinc-500 dark:text-zinc-400', border: 'border-zinc-200 dark:border-white/10' };
  };

  const badgeStyles = getBadgeStyles();

  const getBadgeText = () => {
    if (isCompleted) return 'TAMAMLANDI';
    if (item.daysLeft === 0) return 'BUGÜN';
    if (item.daysLeft === 1) return 'YARIN';
    return `${item.daysLeft} GÜN`;
  };

  // Get brand info
  const brand = getServiceInfo(item.name);

  return (
    <div className="group relative">
      <div className={`${
        isCompleted
          ? 'bg-green-500/[0.05] border-green-500/20 hover:border-green-500/30'
          : 'bg-white/[0.02] dark:bg-white/[0.02] light:bg-zinc-50 border border-zinc-200 dark:border-white/[0.05] hover:border-zinc-300 dark:hover:border-white/[0.1]'
      } hover:bg-zinc-50 dark:hover:bg-white/[0.05] rounded-xl p-4 relative transition-all overflow-hidden shadow-sm dark:shadow-none`}>

        <div className="flex items-center gap-5">

          {/* Sol: Logo */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 flex items-center justify-center">
              <ServiceLogo brand={brand} fallbackText={item.name} />
            </div>
          </div>

          {/* Orta: Bilgiler */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate tracking-tight">
                {item.name}
              </h3>
              {isCompleted && (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
              {item.type === 'subscription' ? 'ABONELİK' : 'KREDİ'} •{' '}
              {item.billing_cycle === 'monthly' ? 'AYLIK' : 'YILLIK'}
              {isCompleted && ' • TAMAMLANDI'}
            </p>

            {isLoan && item.total_installments && (
              <div className="mt-2 max-w-[240px]">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${isCompleted ? 'text-green-500 font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {item.paid_installments || 0} / {item.total_installments} taksit
                  </span>
                  <span className={`text-xs ${isCompleted ? 'text-green-500 font-semibold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    %{loanProgress.toFixed(0)}
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                  <div
                    className={`${isCompleted ? 'bg-green-500' : 'bg-zinc-500 dark:bg-zinc-400'} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${loanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sağ: Tutar & Rozet & Aksiyonlar */}
          <div className="flex items-center gap-3 flex-shrink-0 relative pl-4 h-full">

            {/* Amount Column - Sola Kayma Animasyonu Burası (Değer -90px yapıldı) */}
            <div className="text-right min-w-[120px] transition-all duration-300 ease-out group-hover:translate-x-[-90px]">

              {/* 1. Tutar */}
              <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-white tracking-tighter tabular-nums whitespace-nowrap">
                -{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-lg text-zinc-500 ml-1">₺</span>
              </div>

              {/* 2. Kart Bilgisi Alanı (Placeholder) */}
              <div className="h-4 flex items-center justify-end mt-0.5 mb-1">
                {item.linked_card_details ? (
                  <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 truncate max-w-[140px]">
                    {item.linked_card_details}
                  </div>
                ) : null}
              </div>

              {/* 3. Gün Sayacı */}
              <div className="flex justify-end">
                <div className={`${badgeStyles.bg} ${badgeStyles.text} border ${badgeStyles.border} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap inline-block`}>
                  {getBadgeText()}
                </div>
              </div>

            </div>

            {/* Edit/Delete Butonları - Sağdan Gelme Efekti */}
            <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                  className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50"
                  title="Düzenle"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-2.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 border border-red-200 dark:border-red-500/10 transition-colors backdrop-blur-sm"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}