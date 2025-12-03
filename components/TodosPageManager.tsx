"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Plus, Calendar, Trash2, CheckCircle2, Clock,
  AlertTriangle, GripVertical, MoreHorizontal,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Todo = {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at?: string;
};

interface TodosPageManagerProps {
  todos: Todo[];
  onRefresh?: () => void;
}

// --- TODO ITEM ---
function TodoItem({ 
  todo, 
  onDelete, 
  onUpdate,
  onStatusChange
}: { 
  todo: Todo; 
  onDelete: () => void;
  onUpdate: (updates: Partial<Todo>) => void;
  onStatusChange: (status: Todo['status']) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
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

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'bg-rose-500';
    if (p === 'medium') return 'bg-amber-500';
    return 'bg-sky-500';
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && todo.status !== 'done';

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className={`group bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700/50 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all ${
        isDragging ? 'shadow-xl ring-2 ring-emerald-500/30' : 'shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-all"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onStatusChange(todo.status === 'done' ? 'todo' : 'done')}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            todo.status === 'done'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 dark:hover:border-emerald-500'
          }`}
        >
          {todo.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
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
                if (e.key === 'Escape') {
                  setEditTitle(todo.title);
                  setIsEditing(false);
                }
              }}
              className="w-full bg-transparent text-zinc-900 dark:text-white text-sm font-medium focus:outline-none"
            />
          ) : (
            <p
              onClick={() => setIsEditing(true)}
              className={`text-sm font-medium cursor-text ${
                todo.status === 'done'
                  ? 'text-zinc-400 dark:text-zinc-500 line-through'
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              {todo.title}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1.5">
            {/* Priority */}
            <span className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
            
            {/* Due Date */}
            {todo.due_date && (
              <span className={`text-xs flex items-center gap-1 ${
                isOverdue ? 'text-rose-500' : 'text-zinc-400 dark:text-zinc-500'
              }`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(todo.due_date), 'd MMM', { locale: tr })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-8 z-20 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl py-1"
                >
                  <button
                    onClick={() => { onStatusChange('todo'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <Target className="w-4 h-4 text-amber-500" />
                    Yapılacak
                  </button>
                  <button
                    onClick={() => { onStatusChange('in_progress'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <Clock className="w-4 h-4 text-blue-500" />
                    Devam Ediyor
                  </button>
                  <button
                    onClick={() => { onStatusChange('done'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Tamamlandı
                  </button>
                  <div className="border-t border-zinc-100 dark:border-zinc-700 my-1" />
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Sil
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// --- INLINE ADD FORM ---
function InlineAddForm({ 
  status, 
  onAdd, 
  onCancel 
}: { 
  status: string; 
  onAdd: (title: string, priority: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), priority);
      setTitle('');
      setPriority('medium');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="bg-white dark:bg-zinc-800/80 rounded-lg border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 p-3">
        {/* Priority Selector - Moved to top */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-500">Öncelik:</span>
          <div className="flex items-center gap-1">
            {[
              { value: 'low', label: 'Normal', color: 'bg-sky-500', ring: 'ring-sky-500' },
              { value: 'medium', label: 'Orta', color: 'bg-amber-500', ring: 'ring-amber-500' },
              { value: 'high', label: 'Acil', color: 'bg-rose-500', ring: 'ring-rose-500' }
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  priority === p.value
                    ? `${p.color} text-white shadow-sm`
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Görev adı yazın..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 mb-3"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
          >
            Ekle
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- COLUMN ---
function Column({
  title,
  status,
  icon: Icon,
  color,
  todos,
  onAddTodo,
  onDeleteTodo,
  onUpdateTodo,
  onStatusChange
}: {
  title: string;
  status: string;
  icon: any;
  color: string;
  todos: Todo[];
  onAddTodo: (status: string, title: string, priority: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
  onStatusChange: (id: string, status: Todo['status']) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const getColorClasses = () => {
    if (color === 'amber') return {
      header: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: isOver ? 'border-amber-400' : 'border-transparent',
      count: 'bg-amber-500'
    };
    if (color === 'blue') return {
      header: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: isOver ? 'border-blue-400' : 'border-transparent',
      count: 'bg-blue-500'
    };
    return {
      header: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: isOver ? 'border-emerald-400' : 'border-transparent',
      count: 'bg-emerald-500'
    };
  };

  const colors = getColorClasses();

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[350px] max-w-[450px] flex flex-col h-full rounded-xl border-2 transition-all duration-200 ${colors.border} ${
        isOver ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-zinc-50/50 dark:bg-zinc-900/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${colors.bg}`}>
            <Icon className={`w-4 h-4 ${colors.header}`} />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">{title}</h3>
          <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${colors.count}`}>
            {todos.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onDelete={() => onDeleteTodo(todo.id)}
                onUpdate={(updates) => onUpdateTodo(todo.id, updates)}
                onStatusChange={(status) => onStatusChange(todo.id, status)}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Inline Add Form */}
        <AnimatePresence>
          {isAdding && (
            <InlineAddForm
              status={status}
              onAdd={(title, priority) => {
                onAddTodo(status, title, priority);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </AnimatePresence>

        {/* Add Button (when not adding) */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Görev Ekle</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function TodosPageManager({ todos: initialTodos, onRefresh }: TodosPageManagerProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || []);
  const [activeId, setActiveId] = useState<string | null>(null);

  const supabase = createBrowserClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTodos(data as Todo[]);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Stats
  const todoCount = todos.filter(t => t.status === 'todo').length;
  const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
  const doneCount = todos.filter(t => t.status === 'done').length;

  // Handlers
  const handleAddTodo = async (status: string, title: string, priority: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newTodo = {
      title,
      description: '',
      priority,
      due_date: null,
      status,
      user_id: user.id
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setTodos(prev => [{ ...newTodo, id: tempId } as Todo, ...prev]);

    const { data, error } = await supabase.from('todos').insert(newTodo).select().single();

    if (error) {
      toast.error('Görev eklenemedi');
      setTodos(prev => prev.filter(t => t.id !== tempId));
    } else {
      setTodos(prev => prev.map(t => t.id === tempId ? data : t));
      toast.success('Görev eklendi');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    await supabase.from('todos').delete().eq('id', id);
    toast.success('Görev silindi');
  };

  const handleUpdateTodo = async (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await supabase.from('todos').update(updates).eq('id', id);
  };

  const handleStatusChange = async (id: string, status: Todo['status']) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    await supabase.from('todos').update({ status }).eq('id', id);
    toast.success('Durum güncellendi');
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTodo = todos.find(t => t.id === activeId);
    if (!activeTodo) return;

    const validStatuses = ['todo', 'in_progress', 'done'];
    let newStatus: string;

    if (validStatuses.includes(overId)) {
      newStatus = overId;
    } else {
      const overTodo = todos.find(t => t.id === overId);
      newStatus = overTodo?.status || activeTodo.status;
    }

    if (newStatus !== activeTodo.status) {
      handleStatusChange(activeId, newStatus as Todo['status']);
    }
  };

  const todoTodos = todos.filter(t => t.status === 'todo');
  const inProgressTodos = todos.filter(t => t.status === 'in_progress');
  const doneTodos = todos.filter(t => t.status === 'done');
  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Görevler</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {todos.length} görev · {doneCount} tamamlandı
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{todoCount} yapılacak</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{inProgressCount} devam ediyor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{doneCount} tamamlandı</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {todos.length > 0 && (
            <div className="mt-4 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / todos.length) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(inProgressCount / todos.length) * 100}%` }}
                  className="bg-blue-500 h-full"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(todoCount / todos.length) * 100}%` }}
                  className="bg-amber-500 h-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Board */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-6 h-full min-w-max">
            <Column
              title="Yapılacaklar"
              status="todo"
              icon={Target}
              color="amber"
              todos={todoTodos}
              onAddTodo={handleAddTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
              onStatusChange={handleStatusChange}
            />
            <Column
              title="Devam Ediyor"
              status="in_progress"
              icon={Clock}
              color="blue"
              todos={inProgressTodos}
              onAddTodo={handleAddTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
              onStatusChange={handleStatusChange}
            />
            <Column
              title="Tamamlandı"
              status="done"
              icon={CheckCircle2}
              color="emerald"
              todos={doneTodos}
              onAddTodo={handleAddTodo}
              onDeleteTodo={handleDeleteTodo}
              onUpdateTodo={handleUpdateTodo}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeTodo ? (
          <div className="bg-white dark:bg-zinc-800 border-2 border-emerald-500 rounded-lg p-3 shadow-2xl cursor-grabbing max-w-[350px]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
              <span className="text-zinc-900 dark:text-white font-medium text-sm">{activeTodo.title}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
