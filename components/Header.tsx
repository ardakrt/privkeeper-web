"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient as createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import ProfileDropdown from "@/components/ProfileDropdown";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { useModalStore } from "@/lib/store/useModalStore";
import { useTheme } from "@/contexts/ThemeContext";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const openCommandPalette = useModalStore((state) => state.openCommandPalette);

  const getUser = async () => {
    // Force refresh from server, not cache
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      setUser(data.session.user);
    } else {
      // Fallback to getUser if refresh fails
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
    }
  };

  useEffect(() => {
    setMounted(true);
    getUser();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      getUser();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  // Navigasyon Linkleri
  const navItems = [
    { name: "Notlar", href: "/dashboard/notes" },
    { name: "Cüzdan", href: "/dashboard/wallet" },
    { name: "Abonelikler", href: "/dashboard/subscriptions" },
    { name: "Hatırlatıcılar", href: "/dashboard/reminders" },
    { name: "Zamanlayıcı", href: "/dashboard/timer" },
    { name: "Authenticator", href: "/dashboard/authenticator" },
  ];

  return (
    // Glass Effect Header - Adapts to theme
    <header className="sticky top-0 z-[100] w-full backdrop-blur-md bg-transparent dark:bg-transparent transition-all duration-300 border-b border-transparent dark:border-transparent">
      <div className="mx-auto flex h-20 w-full max-w-[100rem] items-center justify-between px-10">

        {/* LEFT: MINIMAL LOGO */}
        <Link href="/dashboard" className="flex items-center gap-2 group select-none ml-50">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors duration-300">
              Keeper<span className="text-emerald-500 dark:text-emerald-500">.</span>
            </span>
          </div>
        </Link>

        {/* CENTER: FLUID CAPSULE NAVIGATION */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
          <div className="flex items-center p-1.5 rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100/80 dark:bg-black/20 backdrop-blur-2xl shadow-lg dark:shadow-2xl ring-1 ring-zinc-200 dark:ring-white/5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-6 py-2.5 text-sm font-medium transition-colors duration-300 rounded-full z-10 ${isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active"
                      className="absolute inset-0 rounded-full bg-white dark:bg-white/10 shadow-md dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-zinc-200 dark:border-white/5"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* RIGHT: ACTIONS */}
        <div className="flex items-center gap-6">
          {/* Search Button */}
          <motion.button
            onClick={openCommandPalette}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
          >
            <Search className="h-5 w-5 text-zinc-600 dark:text-gray-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-white" />
          </motion.button>

          {/* Theme Toggle */}
          {mounted && (
            <motion.button
              onClick={(e) => toggleTheme(e)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors overflow-hidden relative"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5 text-zinc-600 dark:text-gray-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-white" />
                  ) : (
                    <Sun className="h-5 w-5 text-orange-500 transition-colors group-hover:text-orange-600" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          )}

          {/* Profile */}
          {user && <ProfileDropdown user={user} />}
        </div>

      </div>
    </header>
  );
}