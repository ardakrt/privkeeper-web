"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sun,
  Moon,
  Menu,
  X,
  StickyNote,
  Wallet,
  Receipt,
  Bell,
  Timer,
  Shield,
  HardDrive,
  ListTodo,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useNavigation } from "@/contexts/NavigationContext";

const navigationItems = [
  // Üst Kısım - En Çok Kullanılanlar
  { name: "Authenticator", href: "/dashboard/authenticator", icon: Shield },
  { name: "Drive", href: "/dashboard/drive", icon: HardDrive },
  { name: "Görevler", href: "/dashboard/todos", icon: ListTodo },
  { type: "divider" }, // Ayırıcı
  // Orta Kısım - Finans
  { name: "Cüzdan", href: "/dashboard/wallet", icon: Wallet },
  { name: "Piyasalar", href: "/dashboard/markets", icon: TrendingUp },
  { name: "Abonelikler", href: "/dashboard/subscriptions", icon: Receipt },
  { type: "divider" }, // Ayırıcı
  // Alt Kısım - Araçlar
  { name: "Notlar", href: "/dashboard/notes", icon: StickyNote },
  { name: "Hatırlatıcılar", href: "/dashboard/reminders", icon: Bell },
  { name: "Zamanlayıcı", href: "/dashboard/timer", icon: Timer },
];

export default function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useNavigation();
  const supabase = createBrowserClient();

  // Close sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, setIsMobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Overlay & Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Sidebar Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#FAFAFA] dark:bg-[#09090b] shadow-2xl md:hidden flex flex-col border-r border-zinc-200 dark:border-white/10"
            >
               {/* --- AMBIYANS IŞIĞI (Mobile versiyon için hafifletilmiş) --- */}
               <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 via-blue-500/5 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 p-6 flex items-center justify-between border-b border-zinc-100 dark:border-white/5">
                 <div
                  onClick={() => {
                    router.push('/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight leading-none">
                    Keeper<span className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">.</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navigationItems.map((item, index) => {
                  if (item.type === "divider") {
                    return <div key={`div-${index}`} className="my-2 h-px bg-zinc-100 dark:bg-white/5" />;
                  }

                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  if (!Icon) return null;

                  return (
                    <Link key={item.href} href={item.href || '#'}>
                      <div
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                          ${isActive 
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg shadow-zinc-900/10 dark:shadow-white/10" 
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5"
                          }
                        `}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-100 dark:border-white/5 space-y-3 bg-zinc-50/50 dark:bg-black/20">
                {/* Theme Toggle */}
                <div className="flex bg-zinc-200/50 dark:bg-white/5 rounded-xl p-1">
                  <button
                    onClick={(e) => theme !== "light" && toggleTheme(e)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                      theme === "light" 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Sun size={16} />
                    <span>Açık</span>
                  </button>
                  <button
                    onClick={(e) => theme !== "dark" && toggleTheme(e)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                      theme === "dark" 
                        ? "bg-zinc-800 text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    <Moon size={16} />
                    <span>Koyu</span>
                  </button>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                  <LogOut size={18} />
                  <span>Çıkış Yap</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
