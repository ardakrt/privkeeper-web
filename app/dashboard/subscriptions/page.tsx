"use client";

import { useSubscriptionsData } from "@/hooks/useSubscriptionsData";
import SubscriptionsMobileView from "@/components/finance/SubscriptionsMobileView";
import SubscriptionsDesktopView from "@/components/finance/SubscriptionsDesktopView";

export default function SubscriptionsPage() {
  const data = useSubscriptionsData();

  return (
    <div className="w-full h-full">
      <div className="md:hidden h-full">
        <SubscriptionsMobileView data={data} />
      </div>
      <div className="hidden md:block h-full">
        <SubscriptionsDesktopView data={data} />
      </div>
    </div>
  );
}