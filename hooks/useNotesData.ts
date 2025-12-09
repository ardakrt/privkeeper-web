import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { createBrowserClient } from '@/lib/supabase/client';
import { getNotesCache, invalidateCache } from '@/components/DataPreloader';
import { uploadFile } from '@/app/actions/upload';
import { toast } from 'react-hot-toast';

export interface Attachment {
  id: string;
  url: string;
  isSpoiler?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

export function useNotesData() {
  const { notes: storeNotes, isLoaded, user: storeUser, addNote, updateNote, deleteNote: storeDeleteNote } = useAppStore();
  const [notes, setNotes] = useState<Note[]>(storeNotes || []);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  const lastSavedRef = useRef<{ title: string, content: string, attachments: Attachment[] | null }>({ title: '', content: '', attachments: [] });
  const supabase = createBrowserClient();

  const loadNotes = useCallback(async () => {
    if (isLoaded) {
      if (storeNotes.length > 0 && !selectedNoteId) {
        // Only auto-select on desktop typically, but we leave it to the view to decide
      }
      return;
    }

    let userId = storeUser?.id;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    const cachedNotes = getNotesCache(userId);
    if (cachedNotes && cachedNotes.length > 0) {
      setNotes(cachedNotes);
    }

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (data) {
      setNotes(data);
    }
  }, [supabase, isLoaded, storeNotes, selectedNoteId, storeUser]);

  useEffect(() => {
    if (isLoaded) {
      setNotes(storeNotes);
    }
    loadNotes();
  }, [isLoaded, storeNotes, loadNotes]);

  const selectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title || '');
    setContent(note.content || '');
    setAttachments(note.attachments || []);
    setSaveStatus('saved');
    lastSavedRef.current = { title: note.title || '', content: note.content || '', attachments: note.attachments || [] };
  };

  const createNewNote = async () => {
    if (isCreating) return;
    setIsCreating(true);

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

    const { data, error } = await supabase.from('notes').insert(newNote).select().single();

    if (data) {
      setNewlyCreatedId(data.id);
      setNotes(prev => [data, ...prev]);
      addNote(data);
      selectNote(data);
      toast.success('Yeni not oluşturuldu');
      setTimeout(() => setNewlyCreatedId(null), 2000);
    } else {
      toast.error('Not oluşturulamadı');
    }
    setIsCreating(false);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      storeDeleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setTitle('');
        setContent('');
        setAttachments([]);
      }
      toast.success('Not silindi');
    } else {
      toast.error('Not silinemedi');
    }
  };

  const saveNote = useCallback(async () => {
    if (!selectedNoteId) return;

    const isUnchanged =
      title === lastSavedRef.current.title &&
      content === lastSavedRef.current.content &&
      JSON.stringify(attachments) === JSON.stringify(lastSavedRef.current.attachments);

    if (isUnchanged) return;
    if (!title && !content && attachments.length === 0) return;

    setSaveStatus('saving');

    try {
        const noteData = { title, content, attachments, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('notes').update(noteData).eq('id', selectedNoteId);

        if (error) throw error;

        setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, ...noteData } : n));
        updateNote(selectedNoteId, noteData);
        lastSavedRef.current = { title, content, attachments };
        invalidateCache('notes');
        setSaveStatus('saved');
    } catch (err) {
        setSaveStatus('error');
        toast.error('Not kaydedilirken hata oluştu');
    }
  }, [title, content, attachments, selectedNoteId, supabase, updateNote]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadFile(formData);
      if (result?.success && result.url) {
        setAttachments(prev => [...prev, { id: Date.now().toString(), url: result.url! }]);
      } else {
        toast.error('Yükleme başarısız');
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
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
  };
}
