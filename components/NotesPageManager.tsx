"use client";

import { useNotesData } from "@/hooks/useNotesData";
import NotesMobileView from "@/components/notes/NotesMobileView";
import NotesDesktopView from "@/components/notes/NotesDesktopView";

export default function NotesPageManager() {
  const data = useNotesData();

  return (
    <div className="w-full h-full">
      <div className="md:hidden h-full">
        <NotesMobileView data={data} />
      </div>
      <div className="hidden md:block h-full">
        <NotesDesktopView data={data} />
      </div>
    </div>
  );
}