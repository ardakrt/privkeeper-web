"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Search, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useNotesData, Note } from '@/hooks/useNotesData';
import { stripHtml } from '@/lib/textUtils';

// Re-using the desktop components directly
const NoteEditor = dynamic(() => import('@/components/editor/NoteEditor'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-white/5"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>,
});

const AttachmentsSidebar = dynamic(() => import('@/components/editor/AttachmentsSidebar'), {
  ssr: false,
  loading: () => <div className="w-72 h-full bg-transparent border-l border-white/10 animate-pulse" />
});

export default function NotesDesktopView({ data }: { data: ReturnType<typeof useNotesData> }) {
  const {
    notes,
    selectedNoteId,
    title,
    setTitle,
    content,
    setContent,
    attachments,
    setAttachments,
    isUploading,
    saveStatus,
    isCreating,
    newlyCreatedId,
    selectNote,
    createNewNote,
    deleteNote,
    saveNote,
    handleFileUpload
  } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const [attachmentsWidth, setAttachmentsWidth] = useState(288);
  const attachmentsRef = useRef<HTMLDivElement>(null);
  const isResizingAttachmentsRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Resize Handlers
  const resize = useCallback((e: MouseEvent) => {
    if (isResizingRef.current && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      if (newWidth > 240 && newWidth < 800) setSidebarWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [resize]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, [resize, stopResizing]);

  const resizeAttachments = useCallback((e: MouseEvent) => {
    if (isResizingAttachmentsRef.current && attachmentsRef.current) {
      const newWidth = attachmentsRef.current.getBoundingClientRect().right - e.clientX;
      if (newWidth > 200 && newWidth < 600) setAttachmentsWidth(newWidth);
    }
  }, []);

  const stopResizingAttachments = useCallback(() => {
    isResizingAttachmentsRef.current = false;
    document.removeEventListener("mousemove", resizeAttachments);
    document.removeEventListener("mouseup", stopResizingAttachments);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [resizeAttachments]);

  const startResizingAttachments = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingAttachmentsRef.current = true;
    document.addEventListener("mousemove", resizeAttachments);
    document.addEventListener("mouseup", stopResizingAttachments);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, [resizeAttachments, stopResizingAttachments]);

  // Drag & Drop
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileUpload(files[0]);
  }, [handleFileUpload]);

  // Auto-save & Shortcuts
  useEffect(() => {
    if (!selectedNoteId) return;
    const saveTimer = setTimeout(() => saveNote(), 1000);
    return () => clearTimeout(saveTimer);
  }, [title, content, attachments, saveNote, selectedNoteId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNote]);

  const filteredNotes = notes.filter(note =>
    (note.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (note.content?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Dün';
    if (days < 7) return date.toLocaleDateString('tr-TR', { weekday: 'long' });
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirmNote) return;
    setIsDeleting(true);
    await deleteNote(deleteConfirmNote.id);
    setIsDeleting(false);
    setDeleteConfirmNote(null);
  };

  const handleDeleteAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleToggleSpoiler = (id: string) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, isSpoiler: !a.isSpoiler } : a));
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[98%] h-[88vh] flex relative overflow-hidden rounded-3xl backdrop-blur-xl border border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-black/30 shadow-2xl"
      >
        {/* SIDEBAR */}
        <div ref={sidebarRef} style={{ width: `${sidebarWidth}px` }} className="h-full border-r border-zinc-200 dark:border-white/10 flex flex-col bg-zinc-50/50 dark:bg-black/20 flex-shrink-0 relative">
          <div className="p-4 border-b border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Notlarım</h2>
              <span className="text-xs text-zinc-500 bg-zinc-200 dark:bg-white/10 px-2 py-1 rounded-full">{notes.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Notlarda ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors" />
            </div>
          </div>
          <div className="p-3">
            <motion.button onClick={createNewNote} disabled={isCreating} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-black font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden">
              {isCreating ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full" /><span>Oluşturuluyor...</span></> : <><Plus className="w-5 h-5" /><span>Yeni Not</span></>}
            </motion.button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence>
              {filteredNotes.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-zinc-500" /></div>
                  <p className="text-zinc-500 text-sm">{searchQuery ? 'Not bulunamadı' : 'Henüz not yok'}</p>
                </motion.div>
              ) : (
                filteredNotes.map((note) => {
                  const isNewlyCreated = note.id === newlyCreatedId;
                  return (
                    <motion.div key={note.id} initial={isNewlyCreated ? { opacity: 0, scale: 0.8, y: -20 } : false} animate={{ opacity: 1, scale: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: -20, scale: 0.9 }} transition={{ type: isNewlyCreated ? "spring" : "tween", stiffness: 500, damping: 30 }} onClick={() => selectNote(note)} className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${selectedNoteId === note.id ? 'bg-emerald-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'bg-white dark:bg-white/5 border border-transparent hover:bg-zinc-50 dark:hover:bg-white/10 hover:border-zinc-200 dark:hover:border-white/10'} ${isNewlyCreated ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent' : ''}`}>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmNote(note); }} className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-20"><Trash2 className="w-3.5 h-3.5" /></button>
                      <h3 className={`font-semibold text-sm mb-1 pr-8 truncate relative z-10 ${selectedNoteId === note.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>{note.title || 'Başlıksız Not'}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-2 relative z-10">{stripHtml(note.content) || 'İçerik yok...'}</p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600 relative z-10"><span>{formatDate(note.updated_at || note.created_at)}</span>{note.attachments?.length > 0 && <><span>•</span><span>{note.attachments.length} dosya</span></>}</div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
          <div onMouseDown={startResizing} className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 transition-colors z-50 translate-x-1/2" title="Genişliği ayarla" />
        </div>

        {/* EDITOR PANEL */}
        <div className={`flex-1 h-full flex relative transition-all ${isDragging ? 'ring-4 ring-inset ring-emerald-500/30 bg-emerald-500/5' : ''}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          {isDragging && <div className="absolute inset-0 z-50 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center"><div className="text-emerald-400 font-semibold text-xl flex flex-col items-center gap-3"><svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>Resmi Buraya Bırakın</div></div>}
          {selectedNoteId ? (
            <>
              <main className="flex-1 h-full flex flex-col relative bg-transparent overflow-hidden">
                <div className="h-full flex flex-col">
                  <NoteEditor title={title} content={content} saveStatus={saveStatus} onTitleChange={setTitle} onContentChange={setContent} />
                  <div className="px-8 pb-3 pt-2 flex justify-between items-center text-xs text-zinc-500 font-mono bg-transparent"></div>
                </div>
              </main>
              <div ref={attachmentsRef} style={{ width: `${attachmentsWidth}px` }} className="h-full border-l border-zinc-200 dark:border-white/10 bg-transparent flex-shrink-0 relative">
                <div onMouseDown={startResizingAttachments} className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/50 transition-colors z-50 -translate-x-1/2" title="Genişliği ayarla" />
                <AttachmentsSidebar attachments={attachments} onUpload={handleFileUpload} onDelete={handleDeleteAttachment} onToggleSpoiler={handleToggleSpoiler} isUploading={isUploading} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20"><FileText className="w-12 h-12 text-emerald-500" /></div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Notlarınıza Hoş Geldiniz</h3>
                <p className="text-zinc-500 text-sm mb-6">Düşüncelerinizi yazmaya başlamak için yeni bir not oluşturun veya mevcut notlarınızdan birini seçin.</p>
                <button onClick={createNewNote} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-black font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"><Plus className="w-5 h-5" />İlk Notunuzu Oluşturun</button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteConfirmNote && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmNote(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", duration: 0.5 }} className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="relative p-6 pb-0">
                <button onClick={() => !isDeleting && setDeleteConfirmNote(null)} className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors" disabled={isDeleting}><X className="w-5 h-5" /></button>
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white text-center mb-2">Notu Sil</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-center text-sm">Bu işlem geri alınamaz. Not kalıcı olarak silinecek.</p>
              </div>
              <div className="p-6 pt-4 flex gap-3">
                <button onClick={() => setDeleteConfirmNote(null)} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-white/20 transition-colors">İptal</button>
                <button onClick={confirmDeleteAction} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-2">{isDeleting ? 'Siliniyor...' : <>Sil</>}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
