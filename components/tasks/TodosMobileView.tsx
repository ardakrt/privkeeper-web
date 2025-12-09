"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Plus, Calendar, Trash2, CheckCircle2, Circle,
  Clock, Sparkles, LayoutList, Grid3X3,
  Edit3, X, GripVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { format, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
import { tr } from "date-fns/locale";
import { useAppStore } from "@/lib/store/useAppStore";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Todo = {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at?: string;
  user_id?: string;
  sort_order?: number;
};

// Priority config
const priorityConfig = {
  high: { label: 'Yüksek', color: 'text-rose-600 dark:text-rose-500', bg: 'bg-rose-100 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30', dot: 'bg-rose-500' },
  medium: { label: 'Orta', color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', dot: 'bg-amber-500' },
  low: { label: 'Düşük', color: 'text-sky-600 dark:text-sky-500', bg: 'bg-sky-100 dark:bg-sky-500/10', border: 'border-sky-200 dark:border-sky-500/30', dot: 'bg-sky-500' },
};

// Smart date display
const getSmartDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Bugün', className: 'text-emerald-600 dark:text-emerald-500' };
  if (isTomorrow(date)) return { text: 'Yarın', className: 'text-blue-600 dark:text-blue-500' };
  if (isPast(date)) return { text: format(date, 'd MMM', { locale: tr }), className: 'text-rose-600 dark:text-rose-500' };
  if (isThisWeek(date)) return { text: format(date, 'EEEE', { locale: tr }), className: 'text-zinc-500 dark:text-zinc-400' };
  return { text: format(date, 'd MMM', { locale: tr }), className: 'text-zinc-500 dark:text-zinc-400' };
};

// Sortable Todo Item Wrapper
function SortableTodoItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' // Important for touch devices
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TodoListItem {...props} dragListeners={listeners} />
    </div>
  );
}

// Todo Item for List View
function TodoListItem({ 
  todo, 
  onToggle, 
  onDelete, 
  onUpdate,
  dragListeners
}: { 
  todo: Todo; 
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Todo>) => void;
  dragListeners?: any;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isDone = todo.status === 'done';
  const isOverdue = todo.due_date && isPast(new Date(todo.due_date)) && !isDone;
  const smartDate = getSmartDate(todo.due_date);
  const priority = priorityConfig[todo.priority] || priorityConfig.medium;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      // Scroll to view after a delay to account for keyboard animation
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== todo.title) {
      onUpdate({ title: editTitle.trim() });
    } else {
      setEditTitle(todo.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-3 p-4 rounded-xl border transition-all ${
        isDone 
          ? 'bg-zinc-100 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800/50' 
          : isOverdue
            ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40'
            : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm dark:shadow-none'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...dragListeners}
        className="touch-none p-1 -ml-2 text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 hover:bg-emerald-500/10'
        }`}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-white" />
        ) : (
          <Circle className="w-4 h-4 text-transparent group-hover:text-emerald-500/50" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setEditTitle(todo.title); setIsEditing(false); }
            }}
            className="w-full bg-transparent text-zinc-900 dark:text-white font-medium focus:outline-none border-b border-emerald-500 pb-1"
          />
        ) : (
          <p
            onClick={() => !isDone && setIsEditing(true)}
            className={`font-medium truncate cursor-text ${
              isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'
            }`}
          >
            {todo.title}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.color} ${priority.border} border`}>
            {priority.label}
          </span>
          {smartDate && (
            <span className={`text-xs flex items-center gap-1 ${smartDate.className}`}>
              <Clock className="w-3 h-3" />
              {smartDate.text}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Todo Item for Grid View
function TodoGridItem({ 
  todo, 
  onToggle, 
  onDelete,
}: { 
  todo: Todo; 
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isDone = todo.status === 'done';
  const smartDate = getSmartDate(todo.due_date);
  const priority = priorityConfig[todo.priority] || priorityConfig.medium;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`group relative p-4 rounded-2xl border transition-all h-full ${
        isDone 
          ? 'bg-zinc-100 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' 
          : 'bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/70 shadow-sm dark:shadow-none'
      }`}
    >
      {/* Priority indicator */}
      <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${priority.dot}`} />
      
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mb-3 mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500'
        }`}
      >
        {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
      </button>

      {/* Title */}
      <h3 className={`font-medium mb-2 pr-4 line-clamp-2 ${isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
        {todo.title}
      </h3>

      {/* Meta */}
      <div className="flex items-center justify-between mt-auto">
        {smartDate && (
          <div className={`text-xs flex items-center gap-1.5 ${smartDate.className}`}>
            <Calendar className="w-3.5 h-3.5" />
            {smartDate.text}
          </div>
        )}
        
        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-all ml-auto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Quick Add Component
function QuickAdd({ onAdd }: { onAdd: (title: string, priority: Todo['priority']) => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority);
    setTitle('');
    setPriority('medium');
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTitle('');
    setPriority('medium');
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <motion.div
      layout
      className={`rounded-2xl border transition-all ${
        isExpanded 
          ? 'bg-white dark:bg-zinc-900/60 border-emerald-500/30 shadow-lg dark:shadow-none' 
          : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm dark:shadow-none'
      }`}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 p-4">
          <div className={`w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center transition-colors ${
            isExpanded ? 'border-emerald-500 text-emerald-500' : 'border-zinc-400 dark:border-zinc-600 text-zinc-400 dark:text-zinc-600'
          }`}>
            <Plus className="w-4 h-4" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyDown={handleKeyDown}
            placeholder="Yeni görev ekle..."
            className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              {/* Priority selector */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      priority === p ? priorityConfig[p].bg : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${priorityConfig[p].dot}`} />
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Ekle
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                title="İptal (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </form>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800"
        >
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-3">
            💡 Enter ile ekle, ESC ile iptal et
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// Stats Card
function StatsCard({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

// Main Component
export default function TodosMobileView() {
  const { todos: storeTodos, isLoaded } = useAppStore();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const supabase = createBrowserClient();

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { 
      activationConstraint: { delay: 200, tolerance: 5 } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isLoaded) {
        setTodos(storeTodos as Todo[]);
    }
  }, [storeTodos, isLoaded]);

  // Stats
  const stats = useMemo(() => ({
    total: todos.length,
    active: todos.filter(t => t.status !== 'done').length,
    completed: todos.filter(t => t.status === 'done').length,
    overdue: todos.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length,
  }), [todos]);

  // Filtered todos
  const filteredTodos = useMemo(() => {
    let result = [...todos];

    // Filter
    if (filter === 'active') result = result.filter(t => t.status !== 'done');
    if (filter === 'completed') result = result.filter(t => t.status === 'done');

    return result;
  }, [todos, filter]);

  // Handle Drag End
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      // Optionally sync order to backend here
    }
  }, []);

  // CRUD Operations
  const addTodo = async (title: string, priority: Todo['priority']) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newTodo: Partial<Todo> = {
      title,
      priority,
      status: 'todo',
      user_id: user.id,
    };

    // Optimistic update
    const optimisticTodo = { ...newTodo, id: crypto.randomUUID(), created_at: new Date().toISOString() } as Todo;
    setTodos(prev => [optimisticTodo, ...prev]);

    const { data, error } = await supabase
      .from('todos')
      .insert(newTodo)
      .select()
      .single();

    if (error) {
      setTodos(prev => prev.filter(t => t.id !== optimisticTodo.id));
      toast.error('Görev eklenemedi');
      return;
    }

    // Replace optimistic with real data
    setTodos(prev => prev.map(t => t.id === optimisticTodo.id ? data : t));
    toast.success('Görev eklendi');
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newStatus = todo.status === 'done' ? 'todo' : 'done';
    
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    
    const { error } = await supabase
      .from('todos')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      // Revert on error
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: todo.status } : t));
      toast.error('Güncellenemedi');
      return;
    }
    
    if (newStatus === 'done') {
      toast.success('Tamamlandı! 🎉');
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    // Optimistic
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const { error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Güncellenemedi');
      return;
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistic delete
    const deletedTodo = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      // Revert on error
      if (deletedTodo) setTodos(prev => [...prev, deletedTodo]);
      toast.error('Silinemedi');
      return;
    }

    toast.success('Görev silindi');
  };

  const clearCompleted = async () => {
    const completedIds = todos.filter(t => t.status === 'done').map(t => t.id);
    if (completedIds.length === 0) return;

    const completedTodos = todos.filter(t => t.status === 'done');
    setTodos(prev => prev.filter(t => t.status !== 'done'));

    const { error } = await supabase
      .from('todos')
      .delete()
      .in('id', completedIds);

    if (error) {
      setTodos(prev => [...prev, ...completedTodos]);
      toast.error('Silinemedi');
      return;
    }

    toast.success(`${completedIds.length} görev temizlendi`);
  };

  return (
    <div className="w-full h-full p-4 overflow-auto pb-24">
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-emerald-500" />
              Görevlerim
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              {stats.active} aktif görev
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatsCard icon={LayoutList} label="Toplam" value={stats.total} color="bg-zinc-600 dark:bg-zinc-700" />
          <StatsCard icon={Circle} label="Aktif" value={stats.active} color="bg-blue-500" />
          <StatsCard icon={CheckCircle2} label="Tamamlanan" value={stats.completed} color="bg-emerald-500" />
          <StatsCard icon={Clock} label="Geciken" value={stats.overdue} color="bg-rose-500" />
        </div>

        {/* Quick Add */}
        <QuickAdd onAdd={addTodo} />

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  filter === f 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Tamamlanan'}
              </button>
            ))}
        </div>

        {/* Todo List */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-900/40 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {filter === 'completed' ? 'Tamamlanan görev yok' : 'Henüz görev yok'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredTodos.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredTodos.map((todo) => (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggleTodo(todo.id)}
                    onDelete={() => deleteTodo(todo.id)}
                    onUpdate={(updates: Partial<Todo>) => updateTodo(todo.id, updates)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo, index) => (
                <TodoGridItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggleTodo(todo.id)}
                  onDelete={() => deleteTodo(todo.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer actions */}
        {stats.completed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-4"
          >
            <button
              onClick={clearCompleted}
              className="px-4 py-2 rounded-xl text-xs text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tamamlananları temizle ({stats.completed})
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}