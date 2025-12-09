"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Loader2, HardDrive, Cloud, Image as ImageIcon, FileText, Folder, File,
  Search, Plus, Video, Trash2, Upload, ExternalLink, Check, X, Maximize2,
  ChevronLeft, FolderPlus, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

function formatBytes(bytes: any, decimals = 2) {
  if (!+bytes) return '-';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function DrivePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const [files, setFiles] = useState<any[]>([]);
  const [storage, setStorage] = useState<any>(null);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [folderHistory, setFolderHistory] = useState<{ id: string, name: string }[]>([]);

  // --- ÖNİZLEME STATE ---
  const [previewFile, setPreviewFile] = useState<any>(null);

  // --- CONTEXT MENU STATES ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, fileId?: string, fileName?: string, type?: string, webLink?: string, fileObj?: any } | null>(null);

  // --- YENİ KLASÖR STATE ---
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // --- ONAY MODALI STATE ---
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const supabase = createBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // İLK useEffect
  useEffect(() => {
    checkConnection();
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      setShowSuccess(true);
      window.history.replaceState({}, '', '/dashboard/drive');
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, []);

  // İKİNCİ useEffect
  useEffect(() => {
    const handleClick = () => setContextMenu(null);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewFile) {
          setPreviewFile(null);
        } else if (confirmDialog?.isOpen) {
          setConfirmDialog(null);
        } else if (isCreatingFolder) {
          setIsCreatingFolder(false);
          setNewFolderName('');
        } else if (currentFolderId !== 'root') {
          navigateUp();
        }
      }
    };

    const handlePopState = () => {
      if (currentFolderId !== 'root') {
        navigateUp();
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleEsc);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleEsc);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [previewFile, isCreatingFolder, currentFolderId, confirmDialog]);

  // --- SAĞ TIK MANTIĞI ---
  const handleContextMenu = (e: React.MouseEvent, file?: any) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200;
    const menuHeight = file ? 240 : 160;
    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;

    setContextMenu({
      x,
      y,
      fileId: file?.id,
      fileName: file?.name,
      type: file?.mimeType,
      webLink: file?.webViewLink,
      fileObj: file
    });
  };

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: prefs } = await supabase.from('user_preferences').select('google_refresh_token').eq('user_id', user.id).single();
      if (prefs && prefs.google_refresh_token) {
        setIsConnected(true);
        fetchFiles('root');
      }
    } catch (error) {
      console.error('Bağlantı hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (folderId: string = currentFolderId) => {
    setIsFilesLoading(true);
    try {
      const res = await fetch(`/api/drive/files?folderId=${folderId}`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        setStorage(data.storage);
      }
    } catch (error) {
      toast.error("Dosyalar alınamadı");
    } finally {
      setIsFilesLoading(false);
    }
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = "Emin misiniz?") => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const handleCreateFolder = () => {
    setContextMenu(null);
    setIsCreatingFolder(true);
    setNewFolderName('');
    setTimeout(() => newFolderInputRef.current?.focus(), 100);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }

    const toastId = toast.loading("Klasör oluşturuluyor...");
    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId })
      });
      if (!res.ok) throw new Error("Hata");
      toast.success("Klasör oluşturuldu", { id: toastId });
      setIsCreatingFolder(false);
      setNewFolderName('');
      fetchFiles(currentFolderId);
    } catch (error) {
      toast.error("Klasör oluşturulamadı", { id: toastId });
      setIsCreatingFolder(false);
    }
  };

  const handleFolderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      createFolder();
    } else if (e.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  const handleUploadClick = () => {
    setContextMenu(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const toastId = toast.loading(`${file.name} yükleniyor...`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/drive/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Hata');
      toast.success('Yüklendi', { id: toastId });
      await fetchFiles(currentFolderId);
    } catch (error: any) {
      toast.error('Yüklenemedi', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId?: string, fileName?: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const targetFileId = fileId || contextMenu?.fileId;
    const targetFileName = fileName || contextMenu?.fileName;

    if (!targetFileId) return;
    setContextMenu(null);

    showConfirm(
      `"${targetFileName}" kalıcı olarak silinecek.`,
      async () => {
        const toastId = toast.loading('Siliniyor...');
        try {
          const res = await fetch(`/api/drive/delete?id=${targetFileId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Hata');
          toast.success('Silindi', { id: toastId });
          setFiles(prev => prev.filter(f => f.id !== targetFileId));
        } catch (error: any) {
          toast.error('Silinemedi', { id: toastId });
        }
      },
      'Dosyayı Sil'
    );
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (mimeType.includes('video')) return <Video className="w-5 h-5 text-pink-500" />;
    if (name.endsWith('.rar') || name.endsWith('.zip')) return <HardDrive className="w-5 h-5 text-orange-400" />;
    return <File className="w-5 h-5 text-blue-400" />;
  };

  const enterFolder = (id: string, name: string) => {
    let newHistory = [...folderHistory];
    if (newHistory.length === 0) newHistory.push({ id: 'root', name: 'Ana Dizin' });
    newHistory.push({ id: id, name: name });
    setFolderHistory(newHistory);
    setCurrentFolderId(id);
    fetchFiles(id);
    window.history.pushState({ folderId: id, folderName: name }, '', `/dashboard/drive?folder=${id}`);
  };

  const navigateUp = () => {
    if (currentFolderId === 'root') return;
    const newHistory = [...folderHistory];
    newHistory.pop();
    const parentFolder = newHistory[newHistory.length - 1];
    const targetId = parentFolder ? parentFolder.id : 'root';
    setFolderHistory(newHistory);
    setCurrentFolderId(targetId);
    fetchFiles(targetId);

    if (targetId === 'root') {
      window.history.pushState({}, '', '/dashboard/drive');
    } else {
      window.history.pushState({ folderId: targetId }, '', `/dashboard/drive?folder=${targetId}`);
    }
  };

  const filteredFiles = files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const storageUsage = storage ? (parseInt(storage.usage) / parseInt(storage.limit)) * 100 : 0;
  const storageText = storage ? `${formatBytes(storage.usage)} / ${formatBytes(storage.limit)}` : "Hesaplanıyor...";
  const currentFolderName = folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : "Ana Dizin";

  const handleConnect = () => { window.location.href = '/api/drive/auth'; };

  if (isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-emerald-500" /></div>;

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-zinc-200 dark:border-white/10">
            <HardDrive className="w-10 h-10 text-zinc-900 dark:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Drive'ım</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">Dosyalarına erişmek için bağlan.</p>
          <button onClick={handleConnect} className="bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 px-8 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors mt-4">Google ile Bağlan</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden p-6 relative"
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* --- DOSYA ÖNİZLEME MODALI (DÜZELTİLMİŞ HALİ) --- */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setPreviewFile(null)}
          >
            {/* Butonlar */}
            <div className="absolute top-6 right-6 flex gap-3 z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(previewFile.webViewLink, '_blank'); }} 
                className="p-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors shadow-lg border border-white/10" 
                title="Yeni Sekmede Aç"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setPreviewFile(null)} 
                className="p-3 rounded-full bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 transition-colors shadow-lg border border-white/10" 
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODAL KUTUSU - BOYUT AYARLARI BURADA */}
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="w-full max-w-5xl h-[85vh] flex flex-col bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-6 flex items-center gap-3 bg-zinc-900 border-b border-white/5 select-none shrink-0">
                <div className="p-1.5 bg-zinc-800 rounded-lg">
                  {getFileIcon(previewFile.mimeType, previewFile.name)} 
                </div>
                <span className="text-white font-medium truncate">{previewFile.name}</span>
              </div>

              <div className="flex-1 relative bg-black">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                </div>
                <iframe 
                  src={`https://drive.google.com/file/d/${previewFile.id}/preview`} 
                  className="w-full h-full relative z-10" 
                  allow="autoplay"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SAĞ TIK MENÜSÜ --- */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 w-56 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 overflow-hidden backdrop-blur-xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.fileId ? (
              <>
                <div className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium border-b border-zinc-100 dark:border-white/5 mb-1 truncate select-none">
                  {contextMenu.fileName}
                </div>
                <button onClick={() => { setPreviewFile(contextMenu.fileObj); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left">
                  <Maximize2 className="w-4 h-4" /> Önizle
                </button>
                <button onClick={() => { window.open(contextMenu.webLink, '_blank'); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left">
                  <ExternalLink className="w-4 h-4" /> Aç
                </button>
                <button onClick={() => handleDeleteFile()} className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-left">
                  <Trash2 className="w-4 h-4" /> Sil
                </button>
                <div className="h-px bg-zinc-100 dark:bg-white/10 my-1" />
              </>
            ) : null}
            <button onClick={handleCreateFolder} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left">
              <FolderPlus className="w-4 h-4" /> Yeni Klasör
            </button>
            <button onClick={handleUploadClick} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left">
              <Upload className="w-4 h-4" /> Dosya Yükle
            </button>
            <button onClick={() => { fetchFiles(currentFolderId); setContextMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-left">
              <RefreshCw className="w-4 h-4" /> Yenile
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ONAY MODALI --- */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{confirmDialog.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{confirmDialog.message}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">İptal</button>
                <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors">Sil</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER ALANI --- */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-4 relative z-10">
        <div className="flex flex-col gap-1 md:flex-shrink-0">
          <div className="flex items-center gap-3 text-2xl font-bold text-zinc-900 dark:text-white tracking-tight whitespace-nowrap">
            {currentFolderId !== 'root' && (
              <button onClick={navigateUp} className="hover:bg-zinc-100 dark:hover:bg-white/10 p-1 rounded-lg transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <span className="whitespace-nowrap">{folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : "Ana Dizin"}</span>
          </div>
        </div>

        <div className="flex items-center justify-center md:flex-1 md:max-w-lg">
          <div className="relative group w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
            <input type="text" placeholder="Dosya ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all shadow-sm" />
          </div>
        </div>

        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        <button onClick={handleUploadClick} disabled={isUploading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 md:flex-shrink-0">
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
          <span>Yükle</span>
        </button>
      </div>

      {/* --- DOSYA LİSTESİ --- */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full flex flex-col bg-white/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-zinc-200 dark:border-white/5 text-[11px] font-bold text-zinc-500 tracking-widest uppercase select-none">
            <div className="col-span-6 md:col-span-5 pl-2">Dosya Adı</div>
            <div className="col-span-3 hidden md:block">Sahibi</div>
            <div className="col-span-3 hidden md:block">Tarih</div>
            <div className="col-span-3 md:col-span-1 text-right pr-2">Boyut</div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isFilesLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
            ) : (
              <>
                {isCreatingFolder && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="group grid grid-cols-12 gap-4 items-center px-6 py-3.5 rounded-xl bg-white dark:bg-white/5 border border-emerald-500/50 mb-2">
                    <div className="col-span-6 md:col-span-5 flex items-center gap-4 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-yellow-500/10"><Folder className="w-5 h-5 text-yellow-500 fill-yellow-500/20" /></div>
                      <input ref={newFolderInputRef} type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={handleFolderKeyDown} onBlur={() => !newFolderName.trim() && setIsCreatingFolder(false)} placeholder="Klasör adı..." className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-white font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500" />
                    </div>
                  </motion.div>
                )}
                {filteredFiles.length === 0 && !isCreatingFolder ? (
                  <div className="text-center py-20 text-zinc-500">Klasör boş</div>
                ) : (
                  filteredFiles.map((file, index) => (
                    <motion.div key={file.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} onContextMenu={(e) => handleContextMenu(e, file)} className="group grid grid-cols-12 gap-4 items-center px-6 py-3.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/5 cursor-pointer transition-all duration-200" onClick={() => file.mimeType.includes('folder') ? enterFolder(file.id, file.name) : setPreviewFile(file)}>
                      <div className="col-span-6 md:col-span-5 flex items-center gap-4 overflow-hidden">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${file.mimeType.includes('folder') ? "bg-yellow-500/10 text-yellow-500" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"}`}>{getFileIcon(file.mimeType, file.name)}</div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{file.name}</span>
                      </div>
                      <div className="col-span-3 hidden md:flex items-center gap-2">
                        {file.owners && file.owners[0]?.photoLink ? <img src={file.owners[0].photoLink} alt="owner" className="w-6 h-6 rounded-full border border-zinc-200 dark:border-white/10" /> : <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 dark:text-zinc-300">U</div>}
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{file.owners ? (file.owners[0]?.me ? 'Ben' : file.owners[0]?.displayName) : 'Ben'}</span>
                      </div>
                      <div className="col-span-3 hidden md:block text-sm text-zinc-500 dark:text-zinc-500">{new Date(file.modifiedTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-3">
                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">{file.mimeType.includes('folder') ? '-' : formatBytes(file.size)}</span>
                        <button onClick={(e) => handleDeleteFile(file.id, file.name, e)} className="p-2 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-100 scale-75" title="Sil"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </motion.div>
                  ))
                )}
              </>
            )}
          </div>
          <div className="px-8 py-4 bg-zinc-100/50 dark:bg-black/20 border-t border-zinc-200 dark:border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><Cloud className="w-3 h-3" /><span>{storageText}</span></div>
            <div className="w-32 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: storage ? `${(parseInt(storage.usage) / parseInt(storage.limit)) * 100}%` : '0%' }}></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}