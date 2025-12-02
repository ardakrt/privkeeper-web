import React from 'react';

interface Note {
  id: string;
  title: string;
  date: string;
}

interface NoteListProps {
  notes: Note[];
  activeNoteId?: string;
  onNoteSelect: (id: string) => void;
}

export default function NoteList({ notes, activeNoteId, onNoteSelect }: NoteListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {notes.map((note) => (
        <button
          key={note.id}
          onClick={() => onNoteSelect(note.id)}
          className={`text-left p-4 rounded-lg border transition-all duration-200 ${
            activeNoteId === note.id
              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
        >
          <h3 className={`font-medium truncate ${
            activeNoteId === note.id ? 'text-blue-900' : 'text-zinc-900'
          }`}>
            {note.title || 'Başlıksız Not'}
          </h3>
          <p className="text-xs text-zinc-500 mt-2">{note.date}</p>
        </button>
      ))}
    </div>
  );
}
