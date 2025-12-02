"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { updateUserTheme } from "@/app/actions";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const supabase = createBrowserClient();
  const userSetRef = useRef(false);
  const isTransitioning = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const initial: Theme = root.classList.contains("dark") ? "dark" : "light";
    setThemeState(initial);
    setMounted(true);

    async function loadTheme() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("theme_mode_web")
          .eq("user_id", user.id)
          .single();

        if (prefs?.theme_mode_web && !userSetRef.current) {
          setThemeState(prefs.theme_mode_web as Theme);
        }
      }
    }

    loadTheme();
  }, [supabase]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(async (e?: React.MouseEvent) => {
    if (isTransitioning.current) return;

    userSetRef.current = true;
    const newTheme = theme === "light" ? "dark" : "light";

    const updateDb = async () => {
      try {
        await updateUserTheme(newTheme);
      } catch (error) {
        console.error("Theme update error:", error);
      }
    };

    // View Transition API (Chrome, Edge)
    if (
      document.startViewTransition &&
      e &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      isTransitioning.current = true;
      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setThemeState(newTheme);
        });
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(newTheme);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });

      transition.finished.then(() => {
        isTransitioning.current = false;
      });

      updateDb();
      return;
    }

    // Basit geçiş (View Transition desteklenmiyorsa)
    setThemeState(newTheme);
    updateDb();
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    userSetRef.current = true;
    setThemeState(newTheme);

    try {
      await updateUserTheme(newTheme);
    } catch (error) {
      console.error("Theme update error:", error);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
