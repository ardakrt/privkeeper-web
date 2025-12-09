"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskItem, { Task } from "./TaskItem";
import { Plus } from "lucide-react";

interface TaskColumnProps {
  id: 'todo' | 'in_progress' | 'done';
  title: string;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onAddTask?: () => void; // Only for Todo column usually
}

export default function TaskColumn({ id, title, tasks, onDeleteTask, onAddTask }: TaskColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  const getColumnColor = () => {
    switch (id) {
      case 'todo': return 'bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800';
      case 'in_progress': return 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
      case 'done': return 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30';
      default: return '';
    }
  };

  const getHeaderColor = () => {
    switch (id) {
      case 'todo': return 'text-zinc-600 dark:text-zinc-400';
      case 'in_progress': return 'text-blue-600 dark:text-blue-400';
      case 'done': return 'text-emerald-600 dark:text-emerald-400';
    }
  };

  return (
    <div className="flex flex-col shrink-0 md:shrink h-auto md:h-full min-w-[280px] w-full md:flex-1">
      {/* Header */}
      <div className={`flex items-center justify-between mb-3 px-1 ${getHeaderColor()}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
          <span className="text-xs font-mono bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full opacity-70">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button 
            onClick={onAddTask}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-3xl border p-3 transition-colors overflow-y-auto space-y-3 ${getColumnColor()}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 text-xs">
            Buraya sürükle
          </div>
        )}
      </div>
    </div>
  );
}
