"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, AlertCircle, Plus, Search } from "lucide-react";
import { useSubscriptionsData } from "@/hooks/useSubscriptionsData";
import AddFinanceModal from "@/components/finance/AddFinanceModal";
import AddLoanModal from "@/components/finance/AddLoanModal";
import SubscriptionCard from "@/components/finance/SubscriptionCard";

interface SubscriptionsDesktopViewProps {
  data: ReturnType<typeof useSubscriptionsData>;
}

export default function SubscriptionsDesktopView({ data }: SubscriptionsDesktopViewProps) {
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

  const [currentView, setCurrentView] = useState<"list" | "create">("list");
  const [deletingItem, setDeletingItem] = useState<any | null>(null);

  const getAddButtonText = () => {
    return activeTab === "subscriptions" ? "Yeni Abonelik Ekle" : "Yeni Kredi Ekle";
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setCurrentView("create");
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setCurrentView("create");
  };

  const handleSuccess = async () => {
    await loadSubscriptions();
    setCurrentView("list");
    setEditingItem(null);
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setEditingItem(null);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteSubscription(deletingItem.id);
      setDeletingItem(null);
    } catch (error: any) {
      console.error("Delete Error:", error);
      alert("Silme işlemi başarısız");
    }
  };

  return (
    <div className="w-full h-full pt-6">
      <div className="w-full h-full transition-all duration-500 ease-in-out">
        <div className="w-full min-h-[750px] rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/20 light:bg-white/90 backdrop-blur-sm overflow-hidden light:shadow-xl">
          <div className="p-8 space-y-6">
            {/* Header Section */}
            <div className="relative flex items-center justify-center gap-4">
              <h1 className="absolute left-0 text-2xl font-bold text-white dark:text-white light:text-zinc-900">
                Harcama Takibi
              </h1>

              <div className="flex justify-center w-full max-w-md">
                <div className="relative w-full group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                  </div>
                  <input
                    type="search"
                    placeholder="Abonelik veya kredi ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 bg-zinc-100 hover:bg-zinc-200/50 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60 backdrop-blur-xl border border-transparent dark:border-white/10 focus:bg-white dark:focus:bg-zinc-900/80 focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-11 pr-4 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all duration-300 ease-out outline-none shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              {currentView === 'create' ? (
                <button
                  onClick={handleBackToList}
                  className="absolute right-0 bg-white/5 dark:bg-white/5 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-300 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-400 transition-all flex items-center gap-2"
                >
                  Listeye Dön
                </button>
              ) : (
                <button
                  onClick={handleAddNew}
                  className="absolute right-0 bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white hover:bg-zinc-200 dark:hover:bg-zinc-200 light:hover:bg-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  {getAddButtonText()}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex justify-center md:justify-start">
              <div className="bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-full p-1 flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${activeTab === "subscriptions"
                    ? "bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-900 text-white"
                    : "text-white/70 dark:text-white/70 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200"
                    }`}
                >
                  Abonelikler
                </button>
                <button
                  onClick={() => setActiveTab("loans")}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${activeTab === "loans"
                    ? "bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-900 text-white"
                    : "text-white/70 dark:text-white/70 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200"
                    }`}
                >
                  Krediler
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {currentView === "create" ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "subscriptions" ? (
                    <AddFinanceModal
                      onClose={handleBackToList}
                      onSuccess={handleSuccess}
                      editData={editingItem}
                    />
                  ) : (
                    <AddLoanModal
                      onClose={handleBackToList}
                      onSuccess={handleSuccess}
                      editData={editingItem}
                    />
                  )}
                </motion.div>
              ) : isLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-16">
                  <div className="text-zinc-400">Yükleniyor...</div>
                </motion.div>
              ) : searchFilteredData.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center justify-center py-16 px-4"
                >
                  <div className="bg-zinc-100 dark:bg-zinc-800/50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                    <CreditCard className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-zinc-900 dark:text-white font-semibold text-lg mb-2">
                    {searchQuery.trim() ? "Sonuç bulunamadı" : activeTab === "subscriptions" ? "Henüz abonelik eklenmedi" : "Henüz kredi eklenmedi"}
                  </h3>
                  {!searchQuery.trim() && (
                    <button
                      onClick={handleAddNew}
                      className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 px-6 py-3 rounded-xl text-sm font-semibold mt-4 transition-colors flex items-center gap-2 shadow-lg"
                    >
                      <Plus className="h-5 w-5" />
                      {getAddButtonText()}
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                >
                  {searchFilteredData.map((item) => (
                    <SubscriptionCard
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onDelete={() => setDeletingItem(item)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deletingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#121212] border border-red-200 dark:border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 border-2 border-red-200 dark:border-red-500/30 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  {deletingItem.type === 'subscription' ? 'Aboneliği Sil' : 'Krediyi Sil'}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Bu kaydı silmek istediğinden emin misin?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingItem(null)} className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3.5 rounded-xl transition-all">İptal</button>
                  <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20">Evet, Sil</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
