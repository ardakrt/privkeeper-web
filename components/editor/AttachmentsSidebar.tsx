import Image from 'next/image';
import { Plus, Trash2, MoreHorizontal, Paperclip, Loader2, EyeOff, Eye } from 'lucide-react';
import { useRef, useState } from 'react';
import type { Attachment } from '@/hooks/useNotesData';

interface AttachmentsSidebarProps {
  attachments: Attachment[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  onToggleSpoiler: (id: string) => void;
  isUploading: boolean;
}

export default function AttachmentsSidebar({ attachments, onUpload, onDelete, onToggleSpoiler, isUploading }: AttachmentsSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <aside className="h-full flex flex-col bg-transparent">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200/60 dark:border-white/5">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
          <Paperclip size={14} className="text-zinc-500 dark:text-zinc-400" />
          <span>Ekler</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-white/10 border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300 font-mono shadow-sm">
            {attachments.length}
          </span>
        </div>
        <button 
          onClick={triggerUpload}
          disabled={isUploading}
          className="p-1.5 rounded-md hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:border-zinc-200 dark:hover:border-white/10 border border-transparent text-zinc-500 dark:text-zinc-400 transition-all disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((item) => {
            const isSpoiler = item.isSpoiler;
            const isRevealed = revealedSpoilers.has(item.id);
            const showBlur = isSpoiler && !isRevealed;

            return (
              <div 
                key={item.id} 
                onClick={() => {
                  if (showBlur) {
                    toggleReveal(item.id);
                  } else {
                    window.open(item.url, '_blank');
                  }
                }}
                className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <Image
                  src={item.url}
                  alt="Attachment"
                  fill
                  sizes="15vw"
                  className={`object-cover transition-all duration-300 ${showBlur ? 'blur-xl scale-110' : ''}`}
                />
                
                {/* Spoiler Overlay */}
                {showBlur && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                    <EyeOff className="w-6 h-6 text-white/80" />
                    <span className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Spoiler</span>
                    <span className="text-[9px] text-white/50">Görmek için tıkla</span>
                  </div>
                )}

                {/* Overlay Actions */}
                <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 ${showBlur ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                  {/* Spoiler Toggle Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSpoiler(item.id);
                    }}
                    className={`p-1.5 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-100 dark:border-zinc-700 transition-all transform scale-90 hover:scale-100 ${
                      isSpoiler 
                        ? 'text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30' 
                        : 'text-zinc-500 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                    }`}
                    title={isSpoiler ? "Spoiler'ı kaldır" : "Spoiler ekle"}
                  >
                    {isSpoiler ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1.5 bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-100 dark:border-zinc-700 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all transform scale-90 hover:scale-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Spoiler Badge (when revealed) */}
                {isSpoiler && isRevealed && (
                  <div className="absolute top-1 left-1 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReveal(item.id);
                      }}
                      className="p-1 bg-purple-500/80 hover:bg-purple-600 rounded text-white transition-colors"
                      title="Tekrar gizle"
                    >
                      <EyeOff size={10} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
