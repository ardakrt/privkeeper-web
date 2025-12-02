"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  Plus, Calendar, Trash2, CheckCircle2, ListTodo, Clock,
  AlertCircle, MoreVertical, X, GripVertical, Edit2, Flag, Hourglass
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
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
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

// --- SORTABLE TODO CARD ---
function SortableTodoCard({ todo, onDelete, onEdit }: { todo: Todo; onDelete: (todo: Todo) => void; onEdit: (todo: Todo) => void }) {
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

  const getPriorityColor = (p: string) => {
    if (p === 'high') return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30';
    if (p === 'medium') return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30';
    return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30';
  };

  const getPriorityLabel = (p: string) => {
    if (p === 'high') return 'Yüksek';
    if (p === 'medium') return 'Orta';
    return 'Düşük';
  };

  const isOverdue = todo.due_date && new Date(todo.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 rounded-2xl backdrop-blur-sm transition-all hover:shadow-xl ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="p-4">
        {/* Üst Kısım: Drag Handle ve Öncelik */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <span className={`text-[10px] px-2.5 py-1 rounded-lg border uppercase tracking-wider font-bold ${getPriorityColor(todo.priority)}`}>
              {getPriorityLabel(todo.priority)}
            </span>
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(todo)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 dark:text-zinc-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title="Düzenle"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(todo)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Başlık */}
        <h4 className="text-zinc-900 dark:text-white font-semibold mb-2 text-sm leading-snug">{todo.title}</h4>

        {/* Açıklama */}
        {todo.description && (
          <p className="text-zinc-600 dark:text-zinc-500 text-xs line-clamp-2 mb-3 leading-relaxed">
            {todo.description}
          </p>
        )}

        {/* Alt Kısım: Tarih */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/5">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-500'}`}>
            <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-600'}`} />
            {todo.due_date ? (
              <span>{format(new Date(todo.due_date), 'd MMM', { locale: tr })}</span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-600">Tarih yok</span>
            )}
          </div>
          {isOverdue && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
              Gecikmiş
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- DROPPABLE COLUMN ---
function DroppableColumn({
  title,
  status,
  icon: Icon,
  color,
  todos,
  onDelete,
  onEdit
}: {
  title: string;
  status: string;
  icon: any;
  color: string;
  todos: Todo[];
  onDelete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  // Renk bazlı gradient ve accent tanımları
  const getColumnStyles = () => {
    if (status === 'todo') {
      return {
        gradient: 'from-zinc-500/5 via-transparent to-transparent dark:from-zinc-400/5',
        accent: 'bg-zinc-500',
        iconBg: 'bg-zinc-100 dark:bg-zinc-800/50',
        iconColor: 'text-zinc-600 dark:text-zinc-400',
        hoverBg: 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'
      };
    }
    if (status === 'in_progress') {
      return {
        gradient: 'from-blue-500/5 via-transparent to-transparent dark:from-blue-400/5',
        accent: 'bg-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-500/10',
        iconColor: 'text-blue-600 dark:text-blue-400',
        hoverBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-500/5'
      };
    }
    return {
      gradient: 'from-emerald-500/5 via-transparent to-transparent dark:from-emerald-400/5',
      accent: 'bg-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5'
    };
  };

  const styles = getColumnStyles();

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[320px] flex flex-col h-full relative rounded-2xl border border-zinc-200/50 dark:border-white/5 overflow-hidden transition-all duration-300 ${
        isOver 
          ? 'border-zinc-300 dark:border-white/10 scale-[1.01] shadow-lg' 
          : ''
      }`}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${styles.gradient} pointer-events-none`} />
      
      {/* Glass Background */}
      <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl pointer-events-none" />
      
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${styles.accent} opacity-60`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${styles.iconBg} shadow-sm`}>
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base">{title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                {todos.length === 0 ? 'Görev yok' : `${todos.length} görev`}
              </p>
            </div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg} shadow-sm`}>
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{todos.length}</span>
          </div>
        </div>

        {/* Todo Listesi */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <SortableTodoCard todo={todo} onDelete={onDelete} onEdit={onEdit} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>

          {todos.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-32 border border-dashed border-zinc-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-2 bg-zinc-50/50 dark:bg-white/[0.02]"
            >
              <Icon className="w-8 h-8 opacity-30" />
              <span className="text-xs font-medium">Sürükle & bırak</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function TodosPageManager({ todos: initialTodos, onRefresh }: TodosPageManagerProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });

  const supabase = createBrowserClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  // --- DRAG & DROP HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTodo = todos.find(t => t.id === activeId);
    if (!activeTodo) return;

    // Sütun ID'lerini kontrol et (todo, in_progress, done)
    const validStatuses = ['todo', 'in_progress', 'done'];
    let newStatus: string;

    if (validStatuses.includes(overId)) {
      // Doğrudan sütunun üzerine bırakıldı
      newStatus = overId;
    } else {
      // Başka bir todo'nun üzerine bırakıldı
      const overTodo = todos.find(t => t.id === overId);
      newStatus = overTodo?.status || activeTodo.status;
    }

    if (newStatus !== activeTodo.status) {
      // Optimistic update
      setTodos(prev => prev.map(t =>
        t.id === activeId ? { ...t, status: newStatus as any } : t
      ));

      await supabase
        .from('todos')
        .update({ status: newStatus })
        .eq('id', activeId);

      toast.success('Görev taşındı');
    }
  };

  // --- CRUD OPERATIONS ---
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    const toastId = toast.loading('Ekleniyor...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('todos').insert({
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      due_date: newTodo.due_date || null,
      status: 'todo',
      user_id: user.id
    });

    if (error) {
      toast.error('Hata oluştu', { id: toastId });
    } else {
      toast.success('Görev eklendi', { id: toastId });
      setNewTodo({ title: '', description: '', priority: 'medium', due_date: '' });
      setIsModalOpen(false);
      fetchTodos();
    }
  };

  const handleEditTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodo || !editingTodo.title.trim()) return;

    const toastId = toast.loading('Güncelleniyor...');

    const { error } = await supabase
      .from('todos')
      .update({
        title: editingTodo.title,
        description: editingTodo.description,
        priority: editingTodo.priority,
        due_date: editingTodo.due_date || null,
      })
      .eq('id', editingTodo.id);

    if (error) {
      toast.error('Hata oluştu', { id: toastId });
    } else {
      toast.success('Görev güncellendi', { id: toastId });
      setEditingTodo(null);
      fetchTodos();
    }
  };

  const openDeleteModal = (todo: Todo) => {
    setDeletingTodo(todo);
  };

  const confirmDelete = async () => {
    if (!deletingTodo) return;

    const toastId = toast.loading('Siliniyor...');

    setTodos(prev => prev.filter(t => t.id !== deletingTodo.id));
    await supabase.from('todos').delete().eq('id', deletingTodo.id);

    toast.success("Görev silindi", { id: toastId });
    setDeletingTodo(null);
  };

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo);
  };

  // --- FILTERED TODOS BY STATUS ---
  const todoTodos = todos.filter(t => t.status === 'todo');
  const inProgressTodos = todos.filter(t => t.status === 'in_progress');
  const doneTodos = todos.filter(t => t.status === 'done');

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full flex items-center justify-center p-6 animate-fadeIn">
        <div className="w-full max-w-[95%] h-[85vh] flex flex-col rounded-3xl backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/40 dark:bg-black/40 light:bg-white/90 light:shadow-xl overflow-hidden p-6">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">Görevler</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">Görevlerini sürükle-bırak ile yönet</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} /> Yeni Görev
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-[1000px]">
            <DroppableColumn
              title="Yapılacaklar"
              status="todo"
              icon={Hourglass}
              color="zinc"
              todos={todoTodos}
              onDelete={openDeleteModal}
              onEdit={openEditModal}
            />
            <DroppableColumn
              title="Sürüyor"
              status="in_progress"
              icon={Clock}
              color="blue"
              todos={inProgressTodos}
              onDelete={openDeleteModal}
              onEdit={openEditModal}
            />
            <DroppableColumn
              title="Tamamlandı"
              status="done"
              icon={CheckCircle2}
              color="emerald"
              todos={doneTodos}
              onDelete={openDeleteModal}
              onEdit={openEditModal}
            />
          </div>
        </div>

        </div>
      </div>

      {/* Drag Overlay - DndContext içinde ama container dışında olmalı */}
      <DragOverlay dropAnimation={null}>
        {activeTodo ? (
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-white/30 rounded-2xl p-4 shadow-2xl cursor-grabbing">
            <div className="text-zinc-900 dark:text-white font-semibold text-sm">{activeTodo.title}</div>
          </div>
        ) : null}
      </DragOverlay>

      {/* MODAL: YENİ GÖREV */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                  <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                Yeni Görev Oluştur
              </h2>

              <form onSubmit={handleAddTodo} className="space-y-5">
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Başlık *</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ne yapman gerekiyor?"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    value={newTodo.title}
                    onChange={e => setNewTodo({ ...newTodo, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Açıklama</label>
                  <textarea
                    rows={3}
                    placeholder="Detaylar..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all resize-none"
                    value={newTodo.description}
                    onChange={e => setNewTodo({ ...newTodo, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Öncelik</label>
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none appearance-none cursor-pointer"
                      value={newTodo.priority}
                      onChange={e => setNewTodo({ ...newTodo, priority: e.target.value })}
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Son Tarih</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                      value={newTodo.due_date}
                      onChange={e => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95"
                  >
                    Oluştur
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: DÜZENLE */}
      <AnimatePresence>
        {editingTodo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingTodo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setEditingTodo(null)}
                className="absolute top-5 right-5 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                  <Edit2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                Görevi Düzenle
              </h2>

              <form onSubmit={handleEditTodo} className="space-y-5">
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Başlık *</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ne yapman gerekiyor?"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    value={editingTodo.title}
                    onChange={e => setEditingTodo({ ...editingTodo, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Açıklama</label>
                  <textarea
                    rows={3}
                    placeholder="Detaylar..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all resize-none"
                    value={editingTodo.description}
                    onChange={e => setEditingTodo({ ...editingTodo, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Öncelik</label>
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none appearance-none cursor-pointer"
                      value={editingTodo.priority}
                      onChange={e => setEditingTodo({ ...editingTodo, priority: e.target.value as "low" | "medium" | "high" })}
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-2 block">Son Tarih</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                      value={editingTodo.due_date || ''}
                      onChange={e => setEditingTodo({ ...editingTodo, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 dark:hover:bg-blue-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: SİLME ONAY */}
      <AnimatePresence>
        {deletingTodo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDeletingTodo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#121212] border border-red-200 dark:border-red-500/20 rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                {/* İkon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/20 border-2 border-red-200 dark:border-red-500/30 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>

                {/* Başlık */}
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Görevi Sil
                </h2>

                {/* Açıklama */}
                <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                  Bu görevi silmek istediğinden emin misin?
                </p>

                {/* Görev Bilgisi */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-4 mb-6 text-left">
                  <h3 className="text-zinc-900 dark:text-white font-semibold text-sm mb-1">{deletingTodo.title}</h3>
                  {deletingTodo.description && (
                    <p className="text-zinc-500 text-xs line-clamp-2">{deletingTodo.description}</p>
                  )}
                </div>

                {/* Butonlar */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingTodo(null)}
                    className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3.5 rounded-xl transition-all active:scale-95"
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-red-500 hover:bg-red-600 dark:hover:bg-red-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-95"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DndContext>
  );
}
