import React from 'react';
import { type Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Undo, 
  Redo 
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-1.5 border-none bg-transparent">
      <div className="flex items-center gap-0.5 pr-2 border-r border-zinc-100 dark:border-white/5">
        <ToolbarButton 
          icon={<Heading1 size={16} />} 
          label="Başlık 1" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
        />
        <ToolbarButton 
          icon={<Heading2 size={16} />} 
          label="Başlık 2" 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        />
      </div>
      
      <div className="flex items-center gap-0.5 px-2 border-r border-zinc-100 dark:border-white/5">
        <ToolbarButton 
          icon={<Bold size={16} />} 
          label="Kalın" 
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        />
        <ToolbarButton 
          icon={<Italic size={16} />} 
          label="İtalik" 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        />
        <ToolbarButton 
          icon={<Code size={16} />} 
          label="Kod" 
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
        />
      </div>

      <div className="flex items-center gap-0.5 px-2">
        <ToolbarButton 
          icon={<List size={16} />} 
          label="Liste" 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        />
        <ToolbarButton 
          icon={<ListOrdered size={16} />} 
          label="Sıralı Liste" 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        />
        <ToolbarButton 
          icon={<Quote size={16} />} 
          label="Alıntı" 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        />
      </div>

      <div className="flex items-center gap-0.5 pl-2 ml-auto text-zinc-400 dark:text-zinc-500 border-l border-zinc-100 dark:border-white/5">
        <ToolbarButton 
          icon={<Undo size={14} />} 
          label="Geri Al" 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton 
          icon={<Redo size={14} />} 
          label="Yinele" 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, active = false, onClick, disabled = false }: ToolbarButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        p-1.5 rounded-md transition-all duration-200
        ${active 
          ? 'bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white' 
          : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-zinc-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}
