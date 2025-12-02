import React from 'react';

interface NoteEditorProps {
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export default function NoteEditor({ 
  title, 
  content, 
  onTitleChange, 
  onContentChange 
}: NoteEditorProps) {
  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
      {/* Header / Title Input */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="Not Başlığı..."
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-xl font-semibold text-zinc-900 placeholder-zinc-400 border-none focus:ring-0 bg-transparent p-0"
        />
      </div>

      {/* Content / Textarea */}
      <div className="flex-1 p-4">
        <textarea
          placeholder="Bir şeyler yazmaya başlayın..."
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full h-full resize-none text-zinc-700 placeholder-zinc-400 border-none focus:ring-0 bg-transparent p-0 leading-relaxed"
        />
      </div>
      
      {/* Footer / Toolbar (Optional aesthetic touch) */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-lg flex items-center gap-4 text-sm text-zinc-500">
        <button className="hover:text-zinc-900 transition-colors">B</button>
        <button className="hover:text-zinc-900 transition-colors">I</button>
        <button className="hover:text-zinc-900 transition-colors">U</button>
        <div className="h-4 w-px bg-gray-300 mx-2" />
        <span className="text-xs ml-auto">Kaydedildi</span>
      </div>
    </div>
  );
}
