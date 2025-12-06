'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Search, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { stripHtml } from '@/lib/textUtils';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store/useAppStore';
import { createBrowserClient } from '@/lib/supabase/client';
import { uploadFile } from '@/app/actions/upload';
import { getNotesCache, isCacheFresh, invalidateCache } from '@/components/DataPreloader';

// Lazy load heavy components
const NoteEditor = dynamic(() => import('@/components/editor/NoteEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  ),
});

const AttachmentsSidebar = dynamic(() => import('@/components/editor/AttachmentsSidebar'), {
  ssr: false,
  loading: () => <div className="w-72 h-full bg-transparent border-l border-white/10 animate-pulse" />
});

export interface Attachment {
  id: string;
  url: string;
  isSpoiler?: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  const { notes: storeNotes, isLoaded, user: storeUser, addNote, updateNote, deleteNote: storeDeleteNote } = useAppStore();
  const [notes, setNotes] = useState<Note[]>(storeNotes || []);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  
  // Ref to track last saved state to prevent unnecessary saves
  const lastSavedRef = useRef<{title: string, content: string, attachments: Attachment[] | null}>({ title: '', content: '', attachments: [] });
  
  const supabase = createBrowserClient();

  // Load notes with Cache/Store strategy
  const loadNotes = useCallback(async () => {
    if (isLoaded) {
      // Select first note if store has data and nothing selected
      if (storeNotes.length > 0 && !selectedNoteId) {
        // Defer selection to avoid render issues
        setTimeout(() => selectNote(storeNotes[0]), 0);
      }
      return;
    }

    // Fallback user ID
    let userId = storeUser?.id;
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userId = user.id;
    }

    // Check cache
    const cachedNotes = getNotesCache(userId);
    if (cachedNotes && cachedNotes.length > 0) {
      setNotes(cachedNotes);
      if (!selectedNoteId) setTimeout(() => selectNote(cachedNotes[0]), 0);
      
      if (isCacheFresh('notes', userId)) return;
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (data) {
      setNotes(data);
      if (data.length > 0 && !selectedNoteId) {
        selectNote(data[0]);
      }
    }
  }, [supabase, isLoaded, storeNotes, selectedNoteId, storeUser]);

  useEffect(() => {
    if (isLoaded) {
      setNotes(storeNotes);
    }
    loadNotes();
  }, [isLoaded, storeNotes, loadNotes]);

  // Select a note
  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title || '');
    setContent(note.content || '');
    setAttachments(note.attachments || []);
    setSaveStatus('saved');
    
    // Update ref to current note state
    lastSavedRef.current = {
      title: note.title || '',
      content: note.content || '',
      attachments: note.attachments || []
    };
  };

  // Create new note with animation
  const createNewNote = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    // Use storeUser if available to speed up
    let userId = storeUser?.id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCreating(false);
        return;
      }
      userId = user.id;
    }

    const newNote = {
      user_id: userId,
      title: '',
      content: '',
      attachments: [],
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(newNote)
      .select()
      .single();

    if (data) {
      setNewlyCreatedId(data.id);
      // Update both local state and store
      setNotes(prev => [data, ...prev]);
      addNote(data);
      selectNote(data);
      toast.success('Yeni not oluşturuldu');
      
      // Clear highlight after animation
      setTimeout(() => {
        setNewlyCreatedId(null);
      }, 2000);
    } else if (error) {
      console.error('Error creating note:', error);
      toast.error('Not oluşturulamadı');
    }
    
    setIsCreating(false);
  };

  // Delete note - show confirm modal
  const handleDeleteClick = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmNote(note);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteConfirmNote) return;
    
    setIsDeleting(true);
    const noteId = deleteConfirmNote.id;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (!error) {
      // Update both local state and store
      storeDeleteNote(noteId);
      setNotes(prev => {
        const remaining = prev.filter(n => n.id !== noteId);
        
        // If deleted note was selected, select another
        if (selectedNoteId === noteId) {
          if (remaining.length > 0) {
            // Use setTimeout to avoid state update during render
            setTimeout(() => selectNote(remaining[0]), 0);
          } else {
            setTimeout(() => {
              setSelectedNoteId(null);
              setTitle('');
              setContent('');
              setAttachments([]);
            }, 0);
          }
        }
        
        return remaining;
      });
      
      toast.success('Not silindi');
    } else {
      toast.error('Not silinemedi');
    }
    
    setIsDeleting(false);
    setDeleteConfirmNote(null);
  };

  // Save note
  const saveNote = useCallback(async () => {
    if (!selectedNoteId) return;
    
    // Check if there are actual changes
    const isUnchanged = 
      title === lastSavedRef.current.title && 
      content === lastSavedRef.current.content &&
      JSON.stringify(attachments) === JSON.stringify(lastSavedRef.current.attachments);

    if (isUnchanged) return;

    if (!title && !content && attachments.length === 0) return;

    setSaveStatus('saving');
    
    try {
      // Verify session first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Oturum süreniz dolmuş. Lütfen sayfayı yenileyin.');
        setSaveStatus('error');
        return;
      }

      const noteData = {
        title,
        content,
        attachments,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notes')
        .update(noteData)
        .eq('id', selectedNoteId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        console.error('Update returned no data. User:', user.id, 'Note:', selectedNoteId);
        throw new Error("Not güncellenemedi (Kayıt bulunamadı veya yetki yok)");
      }

      // Update both local state and store
      setNotes(prev => prev.map(n => 
        n.id === selectedNoteId 
          ? { ...n, ...noteData }
          : n
      ));
      
      updateNote(selectedNoteId, noteData);

      // Update reference
      lastSavedRef.current = { 
        title, 
        content, 
        attachments 
      };

      // Update Cache for persistence across reloads
      invalidateCache('notes');

      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving note:', err);
      setSaveStatus('error');
      toast.error('Not kaydedilirken bir hata oluştu');
    }
  }, [title, content, attachments, selectedNoteId, supabase, updateNote]);

  // Auto-save
  useEffect(() => {
    if (!selectedNoteId) return;
    
    const saveTimer = setTimeout(() => {
      saveNote();
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [title, content, attachments, saveNote, selectedNoteId]);

  // Ctrl+S Handler
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

  // File upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Sadece resim dosyaları yüklenebilir.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await uploadFile(formData);
      
      if (result?.success && result.url) {
        setAttachments(prev => [...prev, {
          id: Date.now().toString(),
          url: result.url!
        }]);
      } else {
        console.error("Upload failed:", result?.error);
        alert(result?.error || "Yükleme başarısız oldu.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Bir hata oluştu.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDeleteAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleToggleSpoiler = (id: string) => {
    setAttachments(prev => prev.map(a => 
      a.id === id ? { ...a, isSpoiler: !a.isSpoiler } : a
    ));
  };

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFileUpload]);

  // Drag & Drop
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Filter notes by search
  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Dün';
    } else if (days < 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }
  };

  // Remove explicit Loading state as we use Store/Cache for instant render
  // if (isLoading) return ... (Removed)

  return (
    <div className="w-full h-full flex items-center justify-center p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[98%] h-[88vh] flex relative overflow-hidden rounded-3xl backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/30 dark:bg-black/30 light:bg-white/90 light:shadow-2xl"
      >
        {/* SOL PANEL - Not Listesi */}
        <div className="w-80 h-full border-r border-white/10 dark:border-white/10 light:border-zinc-200 flex flex-col bg-black/20 dark:bg-black/20 light:bg-zinc-50/50">
          {/* Header */}
          <div className="p-4 border-b border-white/10 dark:border-white/10 light:border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white dark:text-white light:text-zinc-900">Notlarım</h2>
              <span className="text-xs text-zinc-500 bg-white/10 dark:bg-white/10 light:bg-zinc-200 px-2 py-1 rounded-full">
                {notes.length}
              </span>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Notlarda ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 dark:bg-white/5 light:bg-white border border-white/10 dark:border-white/10 light:border-zinc-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white dark:text-white light:text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Yeni Not Butonu */}
          <div className="p-3">
            <motion.button
              onClick={createNewNote}
              disabled={isCreating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-black font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
            >
              {isCreating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full"
                  />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Yeni Not</span>
                </>
              )}
              
              {/* Shine effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
                whileHover={{ translateX: "100%" }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>
          </div>

          {/* Not Listesi */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence>
              {filteredNotes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-zinc-500" />
                  </div>
                  <p className="text-zinc-500 text-sm">
                    {searchQuery ? 'Not bulunamadı' : 'Henüz not yok'}
                  </p>
                  {!searchQuery && (
                    <p className="text-zinc-600 text-xs mt-1">
                      Yeni not eklemek için yukarıdaki butona tıklayın
                    </p>
                  )}
                </motion.div>
              ) : (
                filteredNotes.map((note, index) => {
                  const isNewlyCreated = note.id === newlyCreatedId;
                  
                  return (
                  <motion.div
                    key={note.id}
                    initial={isNewlyCreated ? { opacity: 0, scale: 0.8, y: -20 } : false}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      x: 0, 
                      y: 0,
                    }}
                    exit={{ opacity: 0, x: -20, scale: 0.9 }}
                    transition={{ 
                      type: isNewlyCreated ? "spring" : "tween",
                      stiffness: 500,
                      damping: 30,
                      delay: isNewlyCreated ? 0 : 0 
                    }}
                    onClick={() => selectNote(note)}
                    className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedNoteId === note.id
                        ? 'bg-emerald-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/5 dark:bg-white/5 light:bg-white border border-transparent hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-50 hover:border-white/10 dark:hover:border-white/10 light:hover:border-zinc-200'
                    } ${isNewlyCreated ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent' : ''}`}
                  >
                    {/* Yeni not glow efekti */}
                    {isNewlyCreated && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 pointer-events-none"
                        animate={{
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    )}
                    
                    {/* Sparkle efekti yeni not için */}
                    {isNewlyCreated && (
                      <div className="pointer-events-none">
                        <motion.div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"
                          animate={{
                            scale: [0, 1.2, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1,
                            delay: 0.2,
                          }}
                        />
                        <motion.div
                          className="absolute top-1/2 -left-1 w-2 h-2 bg-teal-400 rounded-full"
                          animate={{
                            scale: [0, 1.2, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1,
                            delay: 0.4,
                          }}
                        />
                        <motion.div
                          className="absolute -bottom-1 right-1/3 w-2 h-2 bg-emerald-300 rounded-full"
                          animate={{
                            scale: [0, 1.2, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1,
                            delay: 0.6,
                          }}
                        />
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteClick(note, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <h3 className={`font-semibold text-sm mb-1 pr-8 truncate relative z-10 ${
                      selectedNoteId === note.id
                        ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600'
                        : 'text-white dark:text-white light:text-zinc-900'
                    }`}>
                      {note.title || 'Başlıksız Not'}
                      {isNewlyCreated && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="ml-2 text-[10px] bg-emerald-500 text-white dark:text-black px-1.5 py-0.5 rounded-full font-medium"
                        >
                          Yeni
                        </motion.span>
                      )}
                    </h3>
                    
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2 relative z-10">
                      {stripHtml(note.content) || 'İçerik yok...'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 relative z-10">
                      <span>{formatDate(note.updated_at || note.created_at)}</span>
                      {note.attachments?.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{note.attachments.length} dosya</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* SAĞ PANEL - Editör */}
        <div
          className={`flex-1 h-full flex relative transition-all ${
            isDragging ? 'ring-4 ring-inset ring-emerald-500/30 bg-emerald-500/5' : ''
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center">
              <div className="text-emerald-400 font-semibold text-xl flex flex-col items-center gap-3">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Resmi Buraya Bırakın
              </div>
            </div>
          )}

          {selectedNoteId ? (
            <>
              {/* Editör */}
              <main className="flex-1 h-full flex flex-col relative bg-transparent overflow-hidden">
                <div className="h-full flex flex-col">
                  <NoteEditor 
                    title={title}
                    content={content}
                    saveStatus={saveStatus}
                    onTitleChange={setTitle}
                    onContentChange={setContent}
                  />

                  {/* Status Bar */}
                  <div className="px-8 pb-3 pt-2 flex justify-between items-center text-xs text-zinc-500 font-mono bg-transparent">
                    <span>{content.length} karakter • {content.split(/\s+/).filter(Boolean).length} kelime</span>
                  </div>
                </div>
              </main>

              {/* Ek Dosyalar Paneli - Lazy loaded */}
              <div className="w-72 h-full border-l border-white/10 dark:border-white/10 light:border-zinc-200 bg-transparent">
                <AttachmentsSidebar 
                  attachments={attachments}
                  onUpload={handleFileUpload}
                  onDelete={handleDeleteAttachment}
                  onToggleSpoiler={handleToggleSpoiler}
                  isUploading={isUploading}
                />
              </div>
            </>
          ) : (
            /* Boş Durum */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-sm"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                  <FileText className="w-12 h-12 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-white dark:text-white light:text-zinc-900 mb-2">
                  Notlarınıza Hoş Geldiniz
                </h3>
                <p className="text-zinc-500 text-sm mb-6">
                  Düşüncelerinizi yazmaya başlamak için yeni bir not oluşturun veya mevcut notlarınızdan birini seçin.
                </p>
                <button
                  onClick={createNewNote}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white dark:text-black font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                >
                  <Plus className="w-5 h-5" />
                  İlk Notunuzu Oluşturun
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Silme Onay Modalı */}
      <AnimatePresence>
        {deleteConfirmNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirmNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-md bg-zinc-900 dark:bg-zinc-900 light:bg-white border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative p-6 pb-0">
                <button
                  onClick={() => !isDeleting && setDeleteConfirmNote(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-zinc-500 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-100 transition-colors"
                  disabled={isDeleting}
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Warning Icon */}
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h3 className="text-xl font-bold text-white dark:text-white light:text-zinc-900 text-center mb-2">
                  Notu Sil
                </h3>
                <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 text-center text-sm">
                  Bu işlem geri alınamaz. Not kalıcı olarak silinecek.
                </p>
              </div>

              {/* Note Preview */}
              <div className="p-6">
                <div className="bg-white/5 dark:bg-white/5 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-xl p-4">
                  <h4 className="font-semibold text-white dark:text-white light:text-zinc-900 text-sm mb-1 truncate">
                    {deleteConfirmNote.title || 'Başlıksız Not'}
                  </h4>
                  <p className="text-zinc-500 text-xs line-clamp-2">
                    {stripHtml(deleteConfirmNote.content) || 'İçerik yok...'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setDeleteConfirmNote(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-white/10 dark:bg-white/10 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 hover:bg-white/20 dark:hover:bg-white/20 light:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Sil
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}