import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import EditorToolbar from './EditorToolbar';

interface NoteEditorProps {
  title: string;
  content: string;
  saveStatus: 'saved' | 'saving' | 'error';
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export default function NoteEditor({
  title,
  content,
  saveStatus,
  onTitleChange,
  onContentChange
}: NoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Düşüncelerinizi yazmaya başlayın...',
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-300 dark:before:text-zinc-700 before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[60vh] text-zinc-700 dark:text-zinc-300 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
    },
  });

  // Sync content from prop to editor (primarily for initial load)
  useEffect(() => {
    if (editor && content) {
      const currentHTML = editor.getHTML();
      if (editor.isEmpty && content !== '<p></p>') {
         editor.commands.setContent(content);
      } 
    }
  }, [content, editor]);

  // Handle Note Switching
  useEffect(() => {
     if (editor && content && editor.getHTML() !== content) {
        if (editor.isEmpty) {
            editor.commands.setContent(content);
        }
     }
  }, [content, editor]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* 1. Header / Title Section */}
      <div className="px-8 pt-8 pb-4 relative">
        {/* Save Status Indicator - Top Right */}
        <div className="absolute top-8 right-8 flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
              Kaydediliyor
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-white opacity-50 hover:opacity-100 transition-opacity">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white"></div>
              Kaydedildi
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-900 dark:text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-white ring-2 ring-offset-1 ring-red-500"></div>
              Hata
            </div>
          )}
        </div>

        <div className="group pr-20">
          <input
            type="text"
            placeholder="Başlıksız Not"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-3xl font-bold tracking-tight text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 border-none focus:ring-0 outline-none bg-transparent p-0 transition-all leading-tight"
          />
        </div>
        
        {/* Date / Metadata */}
        <div className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mt-2 flex items-center gap-2">
          <span>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
          <span>{new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 2. Toolbar (Sticky) */}
      <div className="sticky top-0 z-10 bg-transparent px-8 py-2">
        <EditorToolbar editor={editor} />
      </div>

      {/* 3. Content Area */}
      <div className="flex-1 px-8 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none] cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
