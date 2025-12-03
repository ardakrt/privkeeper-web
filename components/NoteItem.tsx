"use client";

import { useState } from "react";
import { deleteNote } from "@/app/actions";
import { toast } from "react-hot-toast";

type Note = {
  id?: string | number;
  title?: string | null;
  content?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

interface NoteItemProps {
  note: Note;
  onRefresh?: () => void;
  onEdit?: (note: Note) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  onTriggerDeleteAll?: () => void;
  onContextMenu?: (note: Note, e: React.MouseEvent) => void;
}

export default function NoteItem({
  note,
  onRefresh,
  onEdit,
  isSelectionMode = false,
  isSelected = false,
  onToggle,
  onTriggerDeleteAll,
  onContextMenu
}: NoteItemProps) {
  // HTML etiketlerini temizle (önizleme için)
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return "";
    }
  };

  const handleDelete = async () => {
    const formData = new FormData();
    formData.append("id", String(note.id ?? ""));
    await deleteNote(formData);
    const { invalidateCache } = await import('@/components/DataPreloader');
    invalidateCache('notes');
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleCardClick = () => {
    if (isSelectionMode && onToggle) {
      onToggle(String(note.id));
    } else {
      onEdit?.(note);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(note, e);
  };

  const cardBaseClasses =
    "bg-white/5 dark:bg-white/5 light:bg-white backdrop-blur-sm border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-xl p-6 transition-all duration-300 cursor-pointer h-full flex flex-col relative hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-50 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300 light:shadow-sm";

  const cardStateClasses = isSelectionMode
    ? isSelected
      ? "border-blue-500 ring-2 ring-blue-500/30 bg-white/10"
      : ""
    : "";

  return (
    <li className="group relative h-full">
      {/* Hover ile Silme Butonu (Seçim modunda gizle) */}
      {!isSelectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-black/50 light:bg-white backdrop-blur-sm text-red-500 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 light:hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 light:border light:border-zinc-200"
          title="Sil"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      {/* Note Card - Ghost/Glass Design */}
      <div
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        className={`${cardBaseClasses} ${cardStateClasses}`}
      >
        {/* Checkbox - Seçim Modunda Görünür */}
        {isSelectionMode && (
          <div className="absolute top-4 left-4 z-10">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-zinc-400 dark:border-zinc-500"
                }`}
            >
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
        {/* Title */}
        <h3 className="font-bold text-lg text-zinc-100 dark:text-zinc-100 light:text-zinc-900 mb-3 line-clamp-2">
          {note.title ?? "(Başlıksız)"}
        </h3>

        {/* Content Preview */}
        <p className="text-zinc-500 dark:text-zinc-500 light:text-zinc-600 text-sm leading-relaxed flex-1 whitespace-pre-wrap line-clamp-3">
          {stripHtml(note.content) || "İçerik yok"}
        </p>

        {/* Footer - Date (updated_at veya created_at) */}
        {(note.updated_at || note.created_at) && (
          <div className="mt-4 pt-3 border-t border-white/[0.05] dark:border-white/[0.05] light:border-zinc-200 flex items-center justify-end">
            <span className="text-xs text-zinc-600 dark:text-zinc-600 light:text-zinc-500 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(note.updated_at ?? note.created_at ?? null)}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
