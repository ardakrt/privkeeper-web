"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FileText, Trash2, ChevronLeft, Save, Paperclip, X, AlertTriangle } from "lucide-react";
import { useNotesData } from "@/hooks/useNotesData";
import { stripHtml } from "@/lib/textUtils";
// We use a simple textarea for mobile content editing to ensure stability and native feel
// Or we can try to adapt the TipTap editor if needed, but simple is often better for mobile text.

export default function NotesMobileView({ data }: { data: ReturnType<typeof useNotesData> }) {
  const {
    notes,
    selectedNoteId,
    title,
    setTitle,
    content,
    setContent,
    createNewNote,
    deleteNote,
    selectNote,
    saveNote,
    isCreating
  } = data;

  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingNote, setDeletingNote] = useState<any | null>(null);

  // Long press handling
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Filter notes
  const filteredNotes = notes.filter(note =>
    (note.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (note.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleTouchStart = (note: any) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50); // Haptic feedback
      }
      setDeletingNote(note);
    }, 500); // 500ms threshold
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    // Cancel if user scrolls
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleNoteClick = (note: any) => {
    if (isLongPress.current) return;
    selectNote(note);
    setIsEditorOpen(true);
  };

  const handleCreate = async () => {
    await createNewNote();
    // After creating, the new note is set as selected in the hook, 
    // but we need to open the editor.
    // Since createNewNote is async, we might need to wait or rely on effect.
    // For simplicity, we assume the hook updates state and we open the editor.
    setIsEditorOpen(true); 
  };

  const handleBack = () => {
    saveNote();
    setIsEditorOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingNote) {
      await deleteNote(deletingNote.id);
      setDeletingNote(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-zinc-900 dark:text-white pb-20">
      {/* Header */}
      {!isEditorOpen && (
        <div className="p-5 pb-0 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="text-emerald-500" />
              Notlar
            </h1>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-10 h-10 rounded-full bg-white dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 shadow-sm"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-white/40" />
            <input
              type="text"
              placeholder="Notlarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-white/40 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      )}

      {/* Note List */}
      {!isEditorOpen && (
        <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 dark:text-white/40">
              <p>{searchQuery ? 'Sonuç bulunamadı' : 'Henüz not yok'}</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNoteClick(note)}
                  onTouchStart={() => handleTouchStart(note)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onContextMenu={(e) => e.preventDefault()} // Prevent context menu
                  className="p-4 bg-white dark:bg-white/5 backdrop-blur-md border border-zinc-200 dark:border-white/5 rounded-2xl active:scale-[0.98] transition-transform select-none shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-white truncate pr-2 w-full">
                      {note.title || 'Başlıksız Not'}
                    </h3>
                    <span className="text-[10px] text-zinc-500 dark:text-white/40 whitespace-nowrap">
                      {formatDate(note.updated_at || note.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-white/50 line-clamp-2 h-8">
                    {stripHtml(note.content) || 'İçerik yok...'}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div className="h-20" />
        </div>
      )}

      {/* Mobile Editor (Full Screen Modal) */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-white dark:bg-black/90 backdrop-blur-xl flex flex-col"
          >
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-black/50">
              <button onClick={handleBack} className="p-2 text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white">
                <ChevronLeft size={24} />
              </button>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (selectedNoteId) {
                        deleteNote(selectedNoteId);
                        setIsEditorOpen(false);
                    }
                  }}
                  className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                    onClick={handleBack} 
                    className="p-2 text-emerald-600 dark:text-emerald-500 font-medium"
                >
                    Tamam
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık"
                className="w-full bg-transparent text-2xl font-bold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/30 border-none outline-none focus:outline-none focus:ring-0 p-0 mb-4 selection:bg-emerald-500/30"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Notunuzu buraya yazın..."
                className="w-full h-[calc(100%-60px)] bg-transparent text-zinc-700 dark:text-white/80 text-base leading-relaxed placeholder-zinc-400 dark:placeholder-white/20 border-none outline-none focus:outline-none focus:ring-0 p-0 resize-none selection:bg-emerald-500/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeletingNote(null)}
          >
            <div 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-red-600 dark:text-red-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Notu Sil</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Bu notu silmek istediğinden emin misin?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingNote(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 dark:bg-red-500 text-white font-medium"
                >
                  Sil
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
