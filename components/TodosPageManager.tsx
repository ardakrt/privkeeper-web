"use client";

import TaskBoard from "@/components/tasks/TaskBoard";
import TodosMobileView from "@/components/tasks/TodosMobileView";

export default function TodosPageManager() {
  return (
    <div className="w-full h-full">
      {/* Desktop View */}
      <div className="hidden md:block w-full h-full">
        <TaskBoard />
      </div>

      {/* Mobile View */}
      <div className="md:hidden w-full h-full">
        <TodosMobileView />
      </div>
    </div>
  );
}