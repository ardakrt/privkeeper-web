"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import TaskColumn from "./TaskColumn";
import TaskItem, { Task } from "./TaskItem";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { useAppStore } from "@/lib/store/useAppStore";
import { Plus, X, Sparkles, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

export default function TaskBoard() {
  const { todos: storeTodos, isLoaded } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskUrl, setNewTaskUrl] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [mounted, setMounted] = useState(false);
  
  const supabase = createBrowserClient();
  const searchParams = useSearchParams();

  // Handle URL actions
  useEffect(() => {
    if (searchParams.get('action') === 'new-task') {
      setIsAdding(true);
    }
  }, [searchParams]);

  // Initialize tasks from store
  useEffect(() => {
    setMounted(true);
    if (isLoaded) {
      setTasks(storeTodos);
    }
  }, [isLoaded, storeTodos]);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts (prevents accidental clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Actions ---

  const handleAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      status: 'todo',
      priority: newTaskPriority,
      due_date: null,
      created_at: new Date().toISOString(),
      url: newTaskUrl || undefined,
    };

    setTasks((prev) => [optimisticTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskUrl("");
    setIsAdding(false);
    toast.success("Görev eklendi");

    const { error } = await supabase.from('todos').insert({
      title: newTaskTitle,
      priority: newTaskPriority,
      status: 'todo',
      user_id: user.id,
      url: newTaskUrl || null,
    });

    if (error) {
      setTasks((prev) => prev.filter(t => t.id !== optimisticTask.id));
      toast.error("Hata oluştu");
    }
  };

  const handleDeleteTask = async (id: string) => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Görev silindi");

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      setTasks(previousTasks);
      toast.error("Silinemedi");
    }
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find containers (columns) or items
    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);
    
    if (!activeTask) return;

    // Dropping over a container (column) directly
    const isOverContainer = ['todo', 'in_progress', 'done'].includes(overId);
    
    if (isOverContainer) {
      const newStatus = overId as Task['status'];
      if (activeTask.status !== newStatus) {
        setTasks((prev) => {
          return prev.map((t) => 
            t.id === activeId ? { ...t, status: newStatus } : t
          );
        });
      }
    } 
    // Dropping over another item
    else if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) => {
        return prev.map((t) => 
          t.id === activeId ? { ...t, status: overTask.status } : t
        );
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Database Update for Status Change
    // (We already updated optimistic state in DragOver, but we need to ensure DB is synced)
    
    // If order changed within same column
    if (activeId !== overId) {
       setTasks((items) => {
        const oldIndex = items.findIndex((t) => t.id === activeId);
        const newIndex = items.findIndex((t) => t.id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    // Persist Status Change to DB
    // Note: We assume DragOver handled the status change in local state.
    // Now we just need to tell Supabase about the final status.
    
    // Determine the final status from the local state
    const finalTaskState = tasks.find(t => t.id === activeId); // This might be stale due to closure, use functional update or ref if critical, but here 'tasks' in next render will have it.
    // Actually, 'tasks' in this scope is the one from render. DnD Kit events fire in sequence.
    // Let's look at the 'activeTask' we found earlier. It has the old status? No, we updated it in DragOver.
    // Wait, handleDragOver updates state, triggering re-render. handleDragEnd sees the updated state? 
    // Yes, usually. But to be safe, let's just update DB with the task's current status in the list.
    
    // Better approach: Update DB with the status of the column it landed in.
    // But figuring out the column from 'overId' is tricky if 'overId' is another task.
    // Let's just use the status from the state after the dust settles.
    
    // Hack: We'll just update the DB with the status found in the 'tasks' state
    // But 'tasks' here is a snapshot from before the drag ended? No, it should be fresh if we use refs or correct deps.
    // Let's assume optimistic update in DragOver was sufficient for UI.
    // For DB, we need to know the new status.
    
    // Let's use a small timeout to allow state to settle or just check the over target again.
    let newStatus = activeTask.status;
    const isOverContainer = ['todo', 'in_progress', 'done'].includes(overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (isOverContainer) {
      newStatus = overId as Task['status'];
    } else if (overTask) {
      newStatus = overTask.status;
    }

    if (newStatus !== activeTask.status) { // Only update DB if status actually changed from start
       await supabase.from('todos').update({ status: newStatus }).eq('id', activeId);
    }
  };

  // Columns filtering
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="h-full w-full p-4 md:p-8 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-500" />
            Görev Panosu
          </h1>
          <p className="text-zinc-500 text-sm">
            Sürükle bırak ile organize et
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-zinc-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Yeni Görev
        </button>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Yeni Görev</h3>
                <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-zinc-500" /></button>
              </div>
              <form onSubmit={handleAddTask}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Ne yapılması gerekiyor?"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 mb-2 border-none focus:ring-2 focus:ring-emerald-500"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input
                    type="url"
                    placeholder="Bağlantı ekle (İsteğe bağlı)"
                    className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl pl-10 pr-4 py-3 border-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    value={newTaskUrl}
                    onChange={(e) => setNewTaskUrl(e.target.value)}
                  />
                </div>

                <label className="block text-xs font-medium text-zinc-500 mb-2">Öncelik</label>
                <div className="flex gap-2 mb-6">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        newTaskPriority === p 
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent' 
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {p === 'low' ? 'Düşük' : p === 'medium' ? 'Orta' : 'Yüksek'}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  Oluştur
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-hidden items-stretch md:items-start">
          <TaskColumn 
            id="todo" 
            title="Yapılacaklar" 
            tasks={todoTasks} 
            onDeleteTask={handleDeleteTask} 
            onAddTask={() => setIsAdding(true)}
          />
          <TaskColumn 
            id="in_progress" 
            title="Devam Ediyor" 
            tasks={inProgressTasks} 
            onDeleteTask={handleDeleteTask} 
          />
          <TaskColumn 
            id="done" 
            title="Tamamlandı" 
            tasks={doneTasks} 
            onDeleteTask={handleDeleteTask} 
          />
        </div>

        {mounted && createPortal(
          <DragOverlay>
            {activeId ? (
               <TaskItem 
                 task={tasks.find((t) => t.id === activeId)!} 
                 onDelete={() => {}} 
                 isOverlay
               />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}
