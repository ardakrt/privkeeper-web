import { useState, useEffect, useMemo, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Subscription, enrichSubscription } from '@/types/finance';

export type TabType = "subscriptions" | "loans";

export function useSubscriptionsData() {
  const [activeTab, setActiveTab] = useState<TabType>("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  const supabase = createBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // router.push("/login"); // Let the layout handle protection or handle it in component
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading subscriptions:", error);
    } else if (data) {
      setSubscriptions(data as Subscription[]);
    }
    setIsLoading(false);
  }, [supabase]);

  // Initial load and URL params handling
  useEffect(() => {
    loadSubscriptions();
    
    const action = searchParams.get('action');
    if (action === 'new-subscription') {
      setActiveTab('subscriptions');
    } else if (action === 'new-loan') {
      setActiveTab('loans');
    }
  }, [loadSubscriptions, searchParams]);

  // Filter data based on active tab
  const filteredData = useMemo(() => {
    const filtered = subscriptions.filter((item) =>
      activeTab === "subscriptions" ? item.type === "subscription" : item.type === "loan"
    );
    return filtered.map(enrichSubscription);
  }, [activeTab, subscriptions]);

  // Search filter
  const searchFilteredData = useMemo(() => {
    if (!searchQuery.trim()) return filteredData;
    const query = searchQuery.toLowerCase();
    return filteredData.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      (item.linked_card_details && item.linked_card_details.toLowerCase().includes(query))
    );
  }, [filteredData, searchQuery]);

  const deleteSubscription = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    await loadSubscriptions();
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    subscriptions,
    isLoading,
    editingItem,
    setEditingItem,
    searchFilteredData,
    loadSubscriptions,
    deleteSubscription
  };
}
