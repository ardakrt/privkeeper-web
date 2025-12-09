"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, History } from "lucide-react";
import ReminderList from "@/components/ReminderList";
import NewReminderForm from "@/components/NewReminderForm";
import { useModalStore } from "@/lib/store/useModalStore";
import { useRemindersData } from "@/hooks/useRemindersData";

interface RemindersDesktopViewProps {
  data: ReturnType<typeof useRemindersData>;
}

export default function RemindersDesktopView({ data }: RemindersDesktopViewProps) {
  const { reminders, loadReminders } = data;
  const [view, setView] = useState<"list" | "create">("list");
  const [tab, setTab] = useState<"active" | "past">("active");
  
  const isAddReminderModalOpen = useModalStore((state) => state.isAddReminderModalOpen);
  const openAddReminderModal = useModalStore((state) => state.openAddReminderModal);
  const closeAddReminderModal = useModalStore((state) => state.closeAddReminderModal);

  const { activeReminders, pastReminders } = useMemo(() => {
    const active: any[] = [];
    const past: any[] = [];
    const now = new Date();

    (reminders || []).forEach((reminder) => {
      const dueDate = reminder.due_at || reminder.due_date ? new Date(reminder.due_at || reminder.due_date!) : null;
      const isExpired = dueDate ? dueDate < now : false;

      if (reminder.is_completed === true || isExpired) {
        past.push(reminder);
      } else {
        active.push(reminder);
      }
    });

    active.sort((a, b) => {
        const dateA = new Date(a.due_at || a.due_date || 0).getTime();
        const dateB = new Date(b.due_at || b.due_date || 0).getTime();
        return dateA - dateB;
    });

    past.sort((a, b) => {
        const dateA = new Date(a.due_at || a.due_date || 0).getTime();
        const dateB = new Date(b.due_at || b.due_date || 0).getTime();
        return dateB - dateA;
    });

    return { activeReminders: active, pastReminders: past };
  }, [reminders]);

  const handleReminderCreated = () => {
    closeAddReminderModal();
    loadReminders();
  };

  const handleCancel = () => {
    closeAddReminderModal();
  };

  return (
    <div className="animate-fadeIn w-full">
      <motion.div
        layout
        transition={{ duration: 0.3 }}
        className="w-full min-h-[750px] flex flex-col rounded-3xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-black/20 backdrop-blur-sm overflow-hidden shadow-xl"
      >
        <div className="p-8 border-b border-zinc-200 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Hatırlatmalarım</h1>
              <p className="text-sm text-zinc-500 dark:text-white/60 mt-1">Planlanmış etkinlikleriniz</p>
            </div>

            {!isAddReminderModalOpen ? (
              <button
                onClick={openAddReminderModal}
                className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Yeni Hatırlatma Ekle
              </button>
            ) : (
              <button
                onClick={closeAddReminderModal}
                className="bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-300 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/20 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Listeye Dön
              </button>
            )}
          </div>

          {!isAddReminderModalOpen && (
            <div className="flex justify-center">
              <div className="bg-zinc-100 dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-1 rounded-2xl flex gap-1">
                <button
                  onClick={() => setTab('active')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${tab === 'active'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5'
                    }`}
                >
                  <Bell size={14} />
                  <span className="hidden sm:inline">Aktif Hatırlatmalar</span>
                  <span className="sm:hidden">Aktif</span>
                  {activeReminders.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-500">
                      {activeReminders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTab('past')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${tab === 'past'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-lg'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5'
                    }`}
                >
                  <History size={14} />
                  <span className="hidden sm:inline">Geçmiş Hatırlatmalar</span>
                  <span className="sm:hidden">Geçmiş</span>
                  {pastReminders.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-zinc-500/20 text-zinc-500">
                      {pastReminders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 w-full h-full">
          <AnimatePresence mode="wait">
            {!isAddReminderModalOpen ? (
              <motion.div
                key={`list-${tab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'active' && (
                    <ReminderList reminders={activeReminders} onRefresh={loadReminders} />
                )}
                
                {tab === 'past' && (
                    pastReminders.length > 0 ? (
                        <ReminderList reminders={pastReminders} onRefresh={loadReminders} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <History className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mb-4" />
                            <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">Geçmiş hatırlatma yok</p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                            Tamamlanan hatırlatmalarınız burada görünecek
                            </p>
                        </div>
                    )
                )}
              </motion.div>
            ) : (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                <NewReminderForm
                  onReminderCreated={handleReminderCreated}
                  onCancel={handleCancel}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
