"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { toast } from "react-hot-toast";
import { useState, useRef, useCallback } from 'react';
import { uploadFile } from "@/app/actions/upload";

// --- CUSTOM IMAGE EXTENSION (Simplified & Stable) ---
const CustomImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 600,
        renderHTML: (attributes) => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px; height: auto; aspect-ratio: auto;`
          };
        },
      },
      rotation: {
        default: 0,
        renderHTML: (attributes) => {
          return {
            'data-rotation': attributes.rotation,
            style: `transform: rotate(${attributes.rotation}deg);`
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align'),
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
    };
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'relative group inline-block max-w-full my-4';

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.className = 'rounded-xl shadow-md transition-all select-none';
      img.style.width = `${node.attrs.width}px`;
      img.style.transform = `rotate(${node.attrs.rotation || 0}deg)`;
      img.style.display = 'block';

      // Control Panel
      const controls = document.createElement('div');
      controls.className = 'absolute -top-12 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-lg p-1.5 shadow-xl z-50 pointer-events-none group-hover:pointer-events-auto';

      // Helper to create buttons
      const createBtn = (icon: string, title: string, onClick: () => void) => {
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.className = 'p-1.5 hover:bg-white/20 rounded text-white/80 hover:text-white transition-colors';
        btn.title = title;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        };
        return btn;
      };

      // Delete
      controls.appendChild(createBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
        "Sil",
        () => {
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
            }
          }
        }
      ));

      // Separator
      const sep1 = document.createElement('div');
      sep1.className = 'w-px h-4 bg-white/20 mx-1 self-center';
      controls.appendChild(sep1);

      // Align Left
      controls.appendChild(createBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 10H3M21 6H3M21 14H3M17 18H3"/></svg>`,
        "Sola Yasla",
        () => {
          if (typeof getPos === 'function') editor.chain().focus().setTextAlign('left').run();
        }
      ));

      // Align Center
      controls.appendChild(createBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10H6M21 6H3M21 14H3M18 18H6"/></svg>`,
        "Ortala",
        () => {
          if (typeof getPos === 'function') editor.chain().focus().setTextAlign('center').run();
        }
      ));

      // Align Right
      controls.appendChild(createBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10H7M21 6H3M21 14H3M21 18H7"/></svg>`,
        "Sağa Yasla",
        () => {
          if (typeof getPos === 'function') editor.chain().focus().setTextAlign('right').run();
        }
      ));

      // Separator
      const sep2 = document.createElement('div');
      sep2.className = 'w-px h-4 bg-white/20 mx-1 self-center';
      controls.appendChild(sep2);

      // Rotate Left
      controls.appendChild(createBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
        "Sola Döndür",
        () => {
          const current = node.attrs.rotation || 0;
          if (typeof getPos === 'function') editor.chain().focus().updateAttributes('image', { rotation: (current - 90) % 360 }).run();
        }
      ));

      // Width Presets
      const sep3 = document.createElement('div');
      sep3.className = 'w-px h-4 bg-white/20 mx-1 self-center';
      controls.appendChild(sep3);

      ['300', '600', '1000'].forEach(size => {
        const btn = document.createElement('button');
        btn.textContent = size === '300' ? 'S' : size === '600' ? 'M' : 'L';
        btn.className = 'px-2 py-1 hover:bg-white/20 rounded text-xs font-bold text-white/80 hover:text-white transition-colors';
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') editor.chain().focus().updateAttributes('image', { width: parseInt(size) }).run();
        };
        controls.appendChild(btn);
      });

      // Resize Handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 shadow-lg border-2 border-white transition-opacity';

      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = img.offsetWidth;

        const onMove = (moveEvent: MouseEvent) => {
          if (!isResizing) return;
          const currentWidth = startWidth + (moveEvent.clientX - startX);
          const newWidth = Math.max(100, Math.min(1200, currentWidth));
          img.style.width = `${newWidth}px`;
        };

        const onUp = () => {
          if (isResizing && typeof getPos === 'function') {
            editor.chain().focus().updateAttributes('image', { width: parseInt(img.style.width) }).run();
          }
          isResizing = false;
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      container.appendChild(controls);
      container.appendChild(img);
      container.appendChild(resizeHandle);

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false;
          img.src = updatedNode.attrs.src;
          img.style.width = `${updatedNode.attrs.width}px`;
          img.style.transform = `rotate(${updatedNode.attrs.rotation || 0}deg)`;
          return true;
        },
        ignoreMutation: (mutation) => {
          return mutation.type === 'attributes' && mutation.attributeName === 'style';
        }
      };
    };
  },
});

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = "Yazmaya başlayın...", 
  editable = true 
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared Upload Logic
  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resim boyutu 5MB'dan küçük olmalı");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFile(formData);

      if (result.success && result.url) {
        return result.url;
      } else {
        throw new Error("Yükleme başarısız");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Resim yüklenemedi");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl shadow-md my-4 mx-auto display-block',
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-emerald-500 hover:underline cursor-pointer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:text-zinc-600 before:float-left before:pointer-events-none h-full',
      }),
    ],
    content: content,
    editable: editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'w-full focus:outline-none min-h-screen text-white/90 text-base leading-relaxed',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleUpload(file).then((url) => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  view.dispatch(view.state.tr.insert(coordinates.pos, schema.nodes.image.create({ src: url, width: 600 })));
                  toast.success("Resim eklendi");
                }
              }
            });
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const url = await handleUpload(file);
    if (url) {
      editor.chain().focus().setImage({ src: url, width: 600 } as any).run();
      toast.success("Resim eklendi");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* --- MAIN TOOLBAR (Floating, Clean) --- */}
      {editable && (
        <div className="sticky top-0 z-20 mb-6 px-3 py-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl flex items-center gap-1 flex-wrap shadow-lg transition-all w-fit">
          {/* Text Style */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg ${editor.isActive('bold') ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="Kalın"
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg ${editor.isActive('italic') ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="İtalik"
          >
            <Italic size={18} />
          </button>
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded-lg ${editor.isActive('heading', { level: 1 }) ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="Başlık 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg ${editor.isActive('heading', { level: 2 }) ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="Başlık 2"
          >
            <Heading2 size={18} />
          </button>
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Lists */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg ${editor.isActive('bulletList') ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="Liste"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg ${editor.isActive('orderedList') ? 'bg-white/20 text-white' : 'text-zinc-500 hover:bg-white/10'}`}
            title="Sıralı Liste"
          >
            <ListOrdered size={18} />
          </button>
          
          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Text Alignment */}
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'left' }) ? 'bg-white/20' : 'text-zinc-500 hover:bg-white/10'}`}
          >
            <AlignLeft size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'center' }) ? 'bg-white/20' : 'text-zinc-500 hover:bg-white/10'}`}
          >
            <AlignCenter size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded-lg ${editor.isActive({ textAlign: 'right' }) ? 'bg-white/20' : 'text-zinc-500 hover:bg-white/10'}`}
          >
            <AlignRight size={18} />
          </button>
        </div>
      )}

      <EditorContent editor={editor} className="flex-1 w-full min-h-screen cursor-text outline-none tiptap-editor" />
    </div>
  );
}
