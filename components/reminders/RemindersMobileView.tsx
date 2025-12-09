"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Search, Calendar, CheckCircle2, Circle, Trash2, X, Clock } from "lucide-react";
import { useRemindersData, Reminder } from "@/hooks/useRemindersData";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface RemindersMobileViewProps {
  data: ReturnType<typeof useRemindersData>;
}

export default function RemindersMobileView({ data }: RemindersMobileViewProps) {
  const { reminders, searchQuery, setSearchQuery, addReminder, deleteReminder, toggleReminder } = data;
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const filteredReminders = reminders.filter(r => {
    const matchesSearch = (r.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const isCompleted = r.is_completed === true;
    
    // Check if expired
    const dueDate = r.due_at || r.due_date ? new Date(r.due_at || r.due_date!) : null;
    const isExpired = dueDate ? dueDate < new Date() : false;

    if (activeTab === 'active') {
      // Active tab shows not completed AND not expired items
      return matchesSearch && !isCompleted && !isExpired;
    } else {
      // Completed tab shows completed OR expired items
      return matchesSearch && (isCompleted || isExpired);
    }
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    setIsAdding(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('due_date', date);

    const success = await addReminder(formData);
    if (success) {
      setTitle("");
      setDate("");
      setIsAddModalOpen(false);
    }
    setIsAdding(false);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: tr });
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-zinc-900 dark:text-white pb-20">
      {/* Header */}
      <div className="p-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="text-emerald-500" />
            Hatırlatıcılar
          </h1>
          <button 
             onClick={() => setIsAddModalOpen(true)}
             className="w-10 h-10 rounded-full bg-white dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 shadow-sm"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white dark:bg-black/20 backdrop-blur-md border border-zinc-200 dark:border-white/5 rounded-xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'active' ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/50'}`}
          >
            Aktif
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'completed' ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-white/50'}`}
          >
            Geçmiş
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-white/40" />
          <input
            type="text"
            placeholder="Hatırlatma ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-white/40 text-sm focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="text-center py-10 text-zinc-400 dark:text-white/40">
            <p>{searchQuery ? 'Sonuç bulunamadı' : activeTab === 'active' ? 'Hatırlatman yok' : 'Geçmiş hatırlatma yok'}</p>
            {!searchQuery && activeTab === 'active' && (
              <button onClick={() => setIsAddModalOpen(true)} className="mt-4 text-emerald-600 dark:text-emerald-500 font-medium">Yeni ekle</button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredReminders.map((reminder, i) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center justify-between p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/5 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button 
                    onClick={() => toggleReminder(reminder.id, reminder.is_completed || false)}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      reminder.is_completed ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-white/30'
                    }`}
                  >
                    {reminder.is_completed && <CheckCircle2 size={14} className="text-white dark:text-black" />}
                  </button>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-zinc-900 dark:text-white truncate ${reminder.is_completed ? 'line-through text-zinc-400 dark:text-white/50' : ''}`}>
                      {reminder.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-white/50 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {formatDate(reminder.due_at || reminder.due_date)}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-2 text-zinc-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div className="h-20" />
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          >
            <div className="w-full h-auto bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col p-6 pb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Yeni Hatırlatma</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Başlık</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 outline-none"
                    placeholder="Ne hatırlatayım?"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Tarih ve Saat</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isAdding ? "Ekleniyor..." : "Ekle"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
