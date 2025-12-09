"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, AlertCircle, Plus, Search, Calendar, Repeat, Wallet, X } from "lucide-react";
import { useSubscriptionsData } from "@/hooks/useSubscriptionsData";
import AddFinanceModal from "@/components/finance/AddFinanceModal";
import AddLoanModal from "@/components/finance/AddLoanModal";
import ServiceLogo from "@/components/finance/ServiceLogo";
import { getBrandInfo } from "@/lib/serviceIcons";

interface SubscriptionsMobileViewProps {
  data: ReturnType<typeof useSubscriptionsData>;
}

export default function SubscriptionsMobileView({ data }: SubscriptionsMobileViewProps) {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isLoading,
    editingItem,
    setEditingItem,
    searchFilteredData,
    loadSubscriptions,
    deleteSubscription
  } = data;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSuccess = async () => {
    await loadSubscriptions();
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteSubscription(deletingItem.id);
      setDeletingItem(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Silme işlemi başarısız");
    }
  };

  const totalMonthly = searchFilteredData.reduce((sum, item) => {
    if (item.billing_cycle === 'monthly') return sum + item.amount;
    return sum + (item.amount / 12);
  }, 0);

  return (
    <div className="flex flex-col h-full bg-transparent text-zinc-900 dark:text-white pb-20">
      {/* Header & Summary Card */}
      <div className="p-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="text-emerald-500" />
            Harcamalar
          </h1>
          <button 
             onClick={handleAddNew}
             className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Summary Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-white/10 backdrop-blur-lg border border-zinc-200 dark:border-white/10 p-6 shadow-xl">
          <div className="relative z-10">
            <p className="text-zinc-500 dark:text-white/60 text-sm font-medium mb-1">
              {activeTab === 'subscriptions' ? 'Toplam Aylık Gider' : 'Toplam Kredi Ödemesi'}
            </p>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">
              ₺{totalMonthly.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium backdrop-blur-md border border-white/5 bg-emerald-500/20 text-emerald-500">
                <Calendar size={14} />
                {searchFilteredData.length} {activeTab === 'subscriptions' ? 'Abonelik' : 'Kredi'}
              </div>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        {/* Tabs & Search */}
        <div className="space-y-3">
          <div className="flex p-1 bg-zinc-100 dark:bg-black/20 backdrop-blur-md border border-zinc-200 dark:border-white/5 rounded-xl">
            <button 
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'subscriptions' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/50'}`}
            >
              Abonelikler
            </button>
            <button 
              onClick={() => setActiveTab('loans')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'loans' ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/50'}`}
            >
              Krediler
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-white/40" />
            <input
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-white/40 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-zinc-300 dark:border-white/20 border-t-emerald-500 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : searchFilteredData.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 dark:text-white/40">
            <p>{searchQuery ? 'Sonuç bulunamadı' : activeTab === 'subscriptions' ? 'Henüz abonelik eklenmedi' : 'Henüz kredi eklenmedi'}</p>
            {!searchQuery && (
              <button onClick={handleAddNew} className="mt-4 text-emerald-500 font-medium">İlk kaydı ekle</button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {searchFilteredData.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleEdit(item)}
                className="flex items-center justify-between p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/5 rounded-2xl active:scale-[0.98] transition-transform shadow-sm dark:shadow-none"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <ServiceLogo 
                      brand={getBrandInfo(item.name)} 
                      fallbackText={item.name} 
                      size="md"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{item.name}</h3>
                    <p className="text-xs text-zinc-500 dark:text-white/50 flex items-center gap-1">
                      <Repeat size={10} />
                      {item.billing_cycle === 'monthly' ? 'Aylık' : 'Yıllık'}
                      {item.linked_card_details && ` • ${item.linked_card_details}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-zinc-900 dark:text-white">₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/40">
                    {new Date(item.start_date || Date.now()).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div className="h-20" /> {/* Bottom spacer */}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <div className="w-full h-[90vh] sm:h-auto sm:max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {editingItem 
                    ? (activeTab === 'subscriptions' ? 'Aboneliği Düzenle' : 'Krediyi Düzenle') 
                    : (activeTab === 'subscriptions' ? 'Yeni Abonelik' : 'Yeni Kredi')}
                </h2>
                <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'subscriptions' ? (
                  <AddFinanceModal
                    onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                    onSuccess={handleSuccess}
                    editData={editingItem}
                    mobileMode={true}
                  />
                ) : (
                  <AddLoanModal
                    onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                    onSuccess={handleSuccess}
                    editData={editingItem}
                    mobileMode={true}
                  />
                )}
                {editingItem && (
                  <button
                    onClick={() => { setDeletingItem(editingItem); setIsModalOpen(false); }}
                    className="w-full mt-4 py-3 text-red-600 dark:text-red-500 font-medium bg-red-100 dark:bg-red-500/10 rounded-xl"
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {deletingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeletingItem(null)}
          >
            <div 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-red-600 dark:text-red-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Silmek istediğine emin misin?</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">Bu işlem geri alınamaz.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-medium hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 dark:bg-red-500 text-white font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
