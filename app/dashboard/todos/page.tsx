'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import TodosPageManager from '@/components/TodosPageManager';
import { useRouter } from 'next/navigation';
import { getTodosCache } from '@/components/DataPreloader';

export default function TodosPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();
  const router = useRouter();

  const loadTodos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check cache first for instant load
    const cachedTodos = getTodosCache(user.id);
    if (cachedTodos && cachedTodos.length > 0) {
      setTodos(cachedTodos);
      setIsLoading(false);

      // Only fetch in background if cache is stale
      const { isCacheFresh } = await import('@/components/DataPreloader');
      if (isCacheFresh('todos', user.id)) {
        console.log(" Using fresh cache for todos");
        return;
      }
    }

    // No cache or stale, load normally
    const { data: todosData } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (todosData) setTodos(todosData);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return (
    <div className="w-full h-full">
      <TodosPageManager todos={todos} onRefresh={loadTodos} />
    </div>
  );
}
