import TodosPageManager from "@/components/TodosPageManager";

export default function TodosPage() {
  return (
    <div className="w-full h-full flex items-center justify-center p-0 md:p-4 animate-fadeIn">
      <div className="w-full h-full md:max-w-[98%] md:h-[88vh] md:rounded-[2.5rem] md:backdrop-blur-xl md:border md:border-zinc-200 md:dark:border-white/10 md:bg-white/80 md:dark:bg-black/40 md:shadow-2xl overflow-hidden">
        <TodosPageManager />
      </div>
    </div>
  );
}
