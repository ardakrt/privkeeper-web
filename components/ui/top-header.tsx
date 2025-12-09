"use client";

import { useState, useEffect } from "react";
import { Search, Command, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useModalStore } from "@/lib/store/useModalStore";
import { useNavigation } from "@/contexts/NavigationContext";

interface TopHeaderProps {
  onSearchClick?: () => void;
}

export default function TopHeader({ onSearchClick }: TopHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createBrowserClient();
  const openCommandPalette = useModalStore((state) => state.openCommandPalette);
  const { setIsMobileMenuOpen } = useNavigation();

  const getUser = async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      setUser(data.session.user);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
    }
  };

  useEffect(() => {
    getUser();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      getUser();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, []);

  return (
    <header className="sticky top-2 z-50 bg-transparent">
      <div className="relative flex items-center justify-between md:justify-center px-4 md:px-8 py-4 h-20 gap-4">
        
        {/* Mobile Menu Button (Left) */}
        <div className="flex md:hidden flex-none">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 rounded-xl bg-zinc-900/30 dark:bg-zinc-900/30 light:bg-white/80 backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 text-zinc-500 dark:text-zinc-500 light:text-zinc-600 active:scale-95 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Search Bar (Center) */}
        <div className="flex md:hidden flex-1 justify-center items-center mr-23 ml-2"> 
           <button 
             onClick={onSearchClick || openCommandPalette}
             className="group relative flex items-center gap-2 w-full max-w-[160px] h-10 px-3 bg-zinc-900/30 dark:bg-zinc-900/30 light:bg-white/80 backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-xl transition-all active:scale-95"
           >
             <Search className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-500 light:text-zinc-600" />
             <span className="text-xs text-zinc-500 dark:text-zinc-500 light:text-zinc-600">Ara...</span>
           </button>
        </div>

        {/* Center - Premium Search Bar (Desktop Only) */}
        <motion.div
          className="hidden md:flex flex-1 items-center justify-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <button
            onClick={onSearchClick || openCommandPalette}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`group relative flex items-center gap-3 w-[480px] h-12 px-4 bg-zinc-900/30 dark:bg-zinc-900/30 light:bg-white/80 hover:bg-zinc-900/50 dark:hover:bg-zinc-900/50 light:hover:bg-white backdrop-blur-xl border rounded-xl transition-all duration-300 ${searchFocused
              ? "border-zinc-500/50 dark:border-zinc-500/50 light:border-emerald-500/50 shadow-lg shadow-cyan-500/10 dark:shadow-cyan-500/10 light:shadow-emerald-500/10"
              : "border-white/10 dark:border-white/10 light:border-zinc-200 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-300"
              }`}
          >
            {/* Search Icon */}
            <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-500 light:text-zinc-400 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 light:group-hover:text-zinc-600 transition-colors" />

            {/* Placeholder Text */}
            <span className="flex-1 text-left text-sm text-zinc-500 dark:text-zinc-500 light:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-400 light:group-hover:text-zinc-700 transition-colors">
              Ara veya komut çalıştır...
            </span>

            {/* Command Badge */}
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 dark:bg-zinc-800/50 light:bg-zinc-100 border border-zinc-700/50 dark:border-zinc-700/50 light:border-zinc-300 rounded-md">
              <Command className="w-3 h-3 text-zinc-500 dark:text-zinc-500 light:text-zinc-600" />
              <span className="text-xs text-zinc-500 dark:text-zinc-500 light:text-zinc-600 font-medium">K</span>
            </div>

            {/* Glow Effect on Hover */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-zinc-700/0 via-zinc-600/5 to-zinc-700/0 dark:from-zinc-700/0 dark:via-zinc-600/5 dark:to-zinc-700/0 light:from-emerald-500/0 light:via-emerald-500/5 light:to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              layoutId="searchGlow"
            />
          </button>
        </motion.div>

        {/* Right - Profile Only */}
        <div className="absolute right-4 md:right-8 flex items-center gap-3">
          {user && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ProfileDropdown user={user} />
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
