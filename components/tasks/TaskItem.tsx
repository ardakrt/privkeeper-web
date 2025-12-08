import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Calendar, Link as LinkIcon, ExternalLink, GripVertical } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { tr } from "date-fns/locale";

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at?: string;
  url?: string;
};

interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}

const priorityConfig = {
  high: {
    label: "Yüksek",
    class: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    dot: "bg-rose-500"
  },
  medium: {
    label: "Orta",
    class: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    dot: "bg-amber-500"
  },
  low: {
    label: "Düşük",
    class: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    dot: "bg-sky-500"
  },
};

const SimpleLinkPreview = ({ url }: { url: string }) => {
  const getDomain = (u: string) => {
    try {
      return new URL(u).hostname.replace('www.', '');
    } catch {
      return u;
    }
  };

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 mt-3 p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5 rounded-xl group/link hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all max-w-full relative overflow-hidden"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 group-hover/link:text-emerald-500 group-hover/link:border-emerald-500/20 transition-colors shrink-0">
        <LinkIcon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 transition-colors">
          {getDomain(url)}
        </p>
        <p className="text-[10px] text-zinc-400 truncate font-medium opacity-80">
          {url}
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover/link:text-emerald-500 transition-colors shrink-0 mr-1" />
    </a>
  );
};

interface TaskContentProps {
  task: Task;
  onDelete: (id: string) => void;
  smartDate: { text: string; color: string; bg: string } | null;
}

const TaskContent = ({ task, onDelete, smartDate }: TaskContentProps) => {
  const priority = priorityConfig[task.priority];

  return (
    <div className="flex flex-col h-full">
      {/* Header: Title & Delete */}
      <div className="flex justify-between items-start gap-3 mb-1">
        <h4 className={`text-[15px] font-semibold text-zinc-800 dark:text-zinc-100 leading-snug ${task.status === 'done' ? 'line-through text-zinc-400 dark:text-zinc-500 decoration-zinc-400' : ''}`}>
          {task.title}
        </h4>
        
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 -mr-1 -mt-1 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all duration-200"
          title="Görevi Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Optional Link Preview */}
      {task.url && <SimpleLinkPreview url={task.url} />}

      {/* Footer: Meta Info */}
      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
        {/* Priority Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${priority.class}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </div>
        
        {/* Date Badge */}
        {smartDate && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ${smartDate.bg} ${smartDate.color} border-transparent`}>
            <Calendar className="w-3 h-3" />
            <span>{smartDate.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function TaskItem({ task, onDelete, isOverlay }: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id, 
    data: { task },
    disabled: isOverlay 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
  };

  // Date formatting with styling
  const getSmartDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    
    if (isToday(date)) return { 
      text: 'Bugün', 
      color: 'text-emerald-700 dark:text-emerald-300', 
      bg: 'bg-emerald-100 dark:bg-emerald-500/20' 
    };
    
    if (isTomorrow(date)) return { 
      text: 'Yarın', 
      color: 'text-blue-700 dark:text-blue-300', 
      bg: 'bg-blue-100 dark:bg-blue-500/20' 
    };
    
    if (isPast(date)) return { 
      text: format(date, 'd MMM', { locale: tr }), 
      color: 'text-rose-700 dark:text-rose-300', 
      bg: 'bg-rose-100 dark:bg-rose-500/20' 
    };
    
    return { 
      text: format(date, 'd MMM', { locale: tr }), 
      color: 'text-zinc-600 dark:text-zinc-400', 
      bg: 'bg-zinc-100 dark:bg-zinc-800' 
    };
  };

  const smartDate = getSmartDate(task.due_date);

  if (isOverlay) {
    return (
      <div className="relative bg-white dark:bg-zinc-900 border border-emerald-500/50 shadow-2xl shadow-emerald-500/20 rounded-2xl p-4 cursor-grabbing rotate-2 scale-105 z-50 overflow-hidden ring-1 ring-emerald-500/20">
         {/* Drag Handle Overlay */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <TaskContent task={task} onDelete={onDelete} smartDate={smartDate} />
      </div>
    );
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 bg-zinc-100 dark:bg-zinc-800/50 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl min-h-[120px] w-full"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white dark:bg-[#121212] border border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-4 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 cursor-grab active:cursor-grabbing touch-none hover:-translate-y-0.5"
    >
      <TaskContent task={task} onDelete={onDelete} smartDate={smartDate} />
    </div>
  );
}