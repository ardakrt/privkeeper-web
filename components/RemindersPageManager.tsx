"use client";

import { useRemindersData } from "@/hooks/useRemindersData";
import RemindersMobileView from "@/components/reminders/RemindersMobileView";
import RemindersDesktopView from "@/components/reminders/RemindersDesktopView";

interface RemindersPageManagerProps {
  reminders?: any[];
  onRefresh?: () => Promise<void> | void;
}

export default function RemindersPageManager({ reminders, onRefresh }: RemindersPageManagerProps) {
  const data = useRemindersData(reminders);

  // If onRefresh is provided by parent, use it for manual refreshes
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      await data.loadReminders();
    }
  };

  const combinedData = {
    ...data,
    loadReminders: handleRefresh
  };

  return (
    <div className="w-full h-full">
      <div className="md:hidden h-full">
        <RemindersMobileView data={combinedData} />
      </div>
      <div className="hidden md:block h-full">
        <RemindersDesktopView data={combinedData} />
      </div>
    </div>
  );
}