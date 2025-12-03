"use client";

import { useState, useEffect, useRef } from "react";
import { updateNote, deleteNote } from "@/app/actions";
import { X, Trash2, Check, Calendar, Clock, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Note = {
  id?: string | number;
  title?: string | null;
  content?: string | null;
  created_at?: string | null;
};

interface NoteEditorProps {
  note: Note;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function NoteEditor({ note, onClose, onRefresh }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = "auto";
      contentRef.current.style.height = contentRef.current.scrollHeight + "px";
    }
  }, [content]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("id", String(note.id ?? ""));
      formData.append("title", title);
      formData.append("content", content);

      await updateNote(formData);
      
      // Cache'i invalidate et - tüm sayfalarda güncel veri görünsün
      const { invalidateCache } = await import('@/components/DataPreloader');
      invalidateCache('notes');
      
      setLastSaved(new Date());
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Not kaydedilemedi:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Auto-save on debounce or close could be implemented here
  // For now, we'll keep manual save + save on close logic from before, 
  // but maybe we can make the manual save button more subtle if we trust auto-save.
  // The previous logic had save-on-close.

  const handleDelete = async () => {
    if (!confirm("Bu notu silmek istediğinizden emin misiniz?")) return;

    try {
      const formData = new FormData();
      formData.append("id", String(note.id ?? ""));
      await deleteNote(formData);
      if (onRefresh) {
        onRefresh();
      }
      onClose();
    } catch (error) {
      console.error("Not silinemedi:", error);
    }
  };

  const handleClose = async () => {
    // Auto-save before closing if changed
    if (title !== note.title || content !== note.content) {
      await handleSave();
    }
    onClose();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 light:bg-black/30 dark:bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Editor Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2,  }}
          className="relative w-full max-w-4xl h-[85vh] light:bg-white dark:bg-[#121212] light:border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Action Bar */}
          <div className="flex items-center justify-between px-6 py-4 light:border-b light:border-zinc-200 dark:border-b dark:border-white/5 light:bg-zinc-50 dark:bg-white/5 backdrop-blur-md z-10">
            {/* Date Info */}
            <div className="flex items-center gap-2 text-xs font-medium light:text-zinc-600 dark:text-zinc-400 light:bg-zinc-100 dark:bg-white/5 px-3 py-1.5 rounded-full light:border-zinc-200 dark:border-white/5 border">
              <Calendar size={12} />
              {formatDate(note.created_at ?? null)}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs light:text-zinc-500 dark:text-zinc-500 mr-2 animate-fadeIn">
                  Kaydedildi
                </span>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-xl light:text-zinc-500 dark:text-zinc-400 light:hover:text-red-600 dark:hover:text-red-400 light:hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
                title="Notu Sil"
              >
                <Trash2 size={18} />
              </button>

              {/* Save Button (Manual) */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 rounded-xl transition-all ${isSaving
                  ? 'light:text-zinc-400 dark:text-zinc-500 bg-transparent'
                  : 'light:text-zinc-500 dark:text-zinc-400 light:hover:text-emerald-600 dark:hover:text-emerald-400 light:hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                  }`}
                title="Kaydet"
              >
                {isSaving ? (
                  <div className="w-4.5 h-4.5 border-2 light:border-zinc-400 dark:border-zinc-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </button>

              <div className="w-px h-6 light:bg-zinc-200 dark:bg-white/10 mx-1" />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl light:text-zinc-500 dark:text-zinc-400 light:hover:text-zinc-900 dark:hover:text-white light:hover:bg-zinc-100 dark:hover:bg-white/10 transition-all"
                title="Kapat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Editor Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ position: 'relative' }}>
            <div className="max-w-3xl mx-auto px-8 py-10">
              {/* Title Input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık"
                className="w-full text-4xl sm:text-5xl font-bold bg-transparent border-none outline-none focus:ring-0 light:text-zinc-900 dark:text-white light:placeholder:text-zinc-400 dark:placeholder:text-zinc-600 mb-8 tracking-tight"
                style={{ position: 'relative' }}
                autoFocus
              />

              {/* Content Textarea */}
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Notunuzu buraya yazın..."
                className="w-full min-h-[500px] bg-transparent border-none outline-none focus:ring-0 text-lg sm:text-xl light:text-zinc-700 dark:text-zinc-300 light:placeholder:text-zinc-400 dark:placeholder:text-zinc-700 leading-relaxed resize-none font-light"
                style={{ position: 'relative' }}
                spellCheck={false}
              />
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .light .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .light .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Fix context menu positioning in modal */
        .fixed.z-50 {
          transform: translateZ(0);
          will-change: transform;
        }
      `}</style>
    </>
  );
}
