'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import NoteEditor from '@/components/editor/NoteEditor';
import AttachmentsSidebar from '@/components/editor/AttachmentsSidebar';
import { uploadFile } from '@/app/actions/upload';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export interface Attachment {
  id: string;
  url: string;
  isSpoiler?: boolean;
}

export default function NotesPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  const supabase = createBrowserClient();
  const router = useRouter();

  // 1. Load Note on Mount
  useEffect(() => {
    const loadNote = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect or handle unauthenticated state
        return;
      }

      // Fetch the most recent note
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setNoteId(data.id);
        setTitle(data.title || '');
        setContent(data.content || '');
        setAttachments(data.attachments || []);
      } else {
        // No note found, ready to create one on first save
      }
      setIsLoading(false);
    };

    loadNote();
  }, [supabase]);

  // Extracted save logic to reuse in Ctrl+S
  const saveNote = useCallback(async () => {
    // Don't save empty initial state if no note exists yet
    if (!noteId && !title && !content && attachments.length === 0) return;

    setSaveStatus('saving');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const noteData = {
      user_id: user.id,
      title,
      content,
      attachments,
      updated_at: new Date().toISOString()
    };

    try {
      if (noteId) {
        const { error } = await supabase
          .from('notes')
          .update(noteData)
          .eq('id', noteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert(noteData)
          .select()
          .single();
        if (error) throw error;
        if (data) setNoteId(data.id);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving note:', err);
      setSaveStatus('error');
    }
  }, [title, content, attachments, noteId, supabase]);

  // 2. Auto-Save Logic
  useEffect(() => {
    if (isLoading) return; 
    
    const saveTimer = setTimeout(() => {
      saveNote();
    }, 1000); // 1 second debounce

    return () => clearTimeout(saveTimer);
  }, [saveNote, isLoading]); // Added saveNote to dependency

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

  // Drag & Drop Handlers
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

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6 animate-fadeIn">
      
      {/* ANA KAPLAYICI (Container) - Framer Motion Animation Added */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`
          w-full max-w-[95%] h-[85vh] flex relative transition-all overflow-hidden rounded-3xl backdrop-blur-xl
          ${isDragging 
            ? 'border border-blue-500 ring-4 ring-blue-50 bg-white dark:bg-zinc-900' 
            : 'border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/40 light:bg-white/90 light:shadow-xl'}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-50/90 dark:bg-blue-900/90 flex items-center justify-center backdrop-blur-sm">
            <div className="text-blue-600 dark:text-blue-200 font-semibold text-xl flex flex-col items-center gap-3">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Resmi Buraya Bırakın
            </div>
          </div>
        )}

        {/* SOL TARA - Editör Alanı (Esnek Genişlik) */}
        <main className="flex-1 h-full flex flex-col relative bg-transparent overflow-hidden">
          <div className="h-full flex flex-col">
            <NoteEditor 
              title={title}
              content={content}
              saveStatus={saveStatus}
              onTitleChange={setTitle}
              onContentChange={setContent}
            />

            {/* Status Bar (Clean - Only char count) */}
            <div className="px-8 pb-2 pt-2 flex justify-between items-center text-xs text-zinc-400 dark:text-white/40 font-mono bg-transparent z-10">
              <span>{content.length} karakter • {content.split(/\s+/).filter(Boolean).length} kelime</span>
            </div>
          </div>
        </main>

        {/* SAĞ TARA - Medya Paneli (Sabit 80 - 320px) */}
        <div className="w-80 h-full border-l border-zinc-200 dark:border-white/10 bg-transparent">
          <AttachmentsSidebar 
            attachments={attachments}
            onUpload={handleFileUpload}
            onDelete={handleDeleteAttachment}
            onToggleSpoiler={handleToggleSpoiler}
            isUploading={isUploading}
          />
        </div>

      </motion.div>
    </div>
  );
}
