"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Wallet,
  Receipt,
  Bell,
  Timer,
  Shield,
  HardDrive,
  ListTodo,
  TrendingUp,
} from "lucide-react";

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

export default function FloatingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ width: 260, x: -100, opacity: 0 }}
      animate={{
        width: isCollapsed ? 80 : 260,
        x: 0,
        opacity: 1
      }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="hidden md:flex fixed left-4 top-4 bottom-6 z-50 flex-col rounded-[2.5rem] border border-white/10 dark:border-white/10 light:border-zinc-300/50 bg-black/40 dark:bg-black/40 light:bg-white/60 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl shadow-black/50 dark:shadow-black/50 light:shadow-zinc-300/20 overflow-hidden relative"
    >
      {/* --- AMBIYANS IŞIĞI --- */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/20 via-blue-500/5 to-transparent dark:from-emerald-500/20 dark:via-blue-500/5 light:from-emerald-500/15 light:via-emerald-500/5 blur-3xl pointer-events-none opacity-60" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-50" />

      {/* --- Header Alanı --- */}
      <div className={`relative z-10 px-0 pt-10 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
        <div
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 group cursor-pointer select-none"
        >
          <div className="flex items-center justify-center overflow-hidden">
            {isCollapsed ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="text-2xl font-bold text-white dark:text-white light:text-zinc-900 tracking-tighter"
              >
                K<span className="text-emerald-500 dark:text-emerald-500 light:text-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">.</span>
              </motion.span>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <span className="text-2xl font-bold text-white dark:text-white light:text-zinc-900 tracking-tight leading-none group-hover:text-zinc-200 dark:group-hover:text-zinc-200 light:group-hover:text-zinc-700 transition-colors">
                  Keeper<span className="text-emerald-500 dark:text-emerald-500 light:text-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">.</span>
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* --- Navigasyon --- */}
      <nav className="relative z-10 flex-1 px-3 space-y-2 overflow-y-auto scrollbar-none py-2">
        {navigationItems.map((item, index) => {
          // Ayırıcı elementi
          if (item.type === "divider") {
            return (
              <div key={`divider-${index}`} className="py-2">
                <div className="h-px bg-white/5 dark:bg-white/5 light:bg-zinc-200" />
              </div>
            );
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (!Icon) return null;

          return (
            <Link key={item.href || index} href={item.href || '#'}>
              <motion.div
                title={isCollapsed ? item.name : ""}
                className={`
                  relative flex items-center gap-3 px-3 py-3 rounded-2xl
                  transition-all duration-300 cursor-pointer group
                  ${isCollapsed ? "justify-center" : ""}
                  ${isActive
                    ? "text-black dark:text-black light:text-white"
                    : "text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-zinc-100"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 rounded-2xl bg-white/90 dark:bg-white/90 light:bg-zinc-900 shadow-[0_0_20px_rgba(255,255,255,0.2)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] light:shadow-[0_0_20px_rgba(0,0,0,0.1)] backdrop-blur-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className={`
                  relative z-10 flex items-center justify-center w-6 h-6 flex-shrink-0
                  transition-all duration-300
                `}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "text-black dark:text-black light:text-white" : "text-zinc-400 dark:text-zinc-400 light:text-zinc-600 group-hover:text-white dark:group-hover:text-white light:group-hover:text-zinc-900"}
                  />
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                    className="relative z-10 text-[14px] font-medium tracking-wide whitespace-nowrap overflow-hidden ml-1"
                  >
                    {item.name}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* --- Footer & Toggle --- */}
      {/* DÜZELTME 2: 
          - 'pb-8': Alt taraftan ekstra boşluk bıraktık ki butonlar kavisli köşeye çarpmasın.
          - 'gap-3': Butonlar arası boşluğu biraz azalttık, daha derli toplu olsun.
      */}
      <div className="relative z-10 p-4 pb-8 flex flex-col gap-2">

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            w-full flex items-center justify-center py-3 rounded-xl
            bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/5 dark:border-white/5 light:border-zinc-200
            text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200
            transition-all duration-300 group
          `}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={20} />}
        </button>

        {/* Tema Ayarı */}
        {!isCollapsed ? (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="relative bg-white/5 dark:bg-white/5 light:bg-zinc-100 rounded-2xl p-1.5 border border-white/5 dark:border-white/5 light:border-zinc-200 flex items-center backdrop-blur-sm origin-top"
          >
              <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 dark:bg-white/10 light:bg-emerald-500 rounded-xl shadow-sm border border-white/5 dark:border-white/5 light:border-emerald-600"
                animate={{ x: theme === "light" ? 0 : "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button
                onClick={(e) => theme !== "light" && toggleTheme(e)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl relative z-10 transition-colors ${theme === "light" ? "text-white dark:text-white light:text-white" : "text-zinc-500 dark:text-zinc-500 light:text-zinc-600"}`}
              >
                <Sun size={16} />
                <span className="text-xs font-medium">Açık</span>
              </button>
              <button
                onClick={(e) => theme !== "dark" && toggleTheme(e)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl relative z-10 transition-colors ${theme === "dark" ? "text-white dark:text-white light:text-zinc-900" : "text-zinc-500 dark:text-zinc-500 light:text-zinc-600"}`}
              >
                <Moon size={16} />
                <span className="text-xs font-medium">Koyu</span>
              </button>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => toggleTheme(e)}
              className="w-full py-3 flex items-center justify-center rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 hover:text-white dark:hover:text-white light:hover:text-zinc-900 text-zinc-500 dark:text-zinc-500 light:text-zinc-600 border border-white/5 dark:border-white/5 light:border-zinc-200 transition-colors"
            >
              {theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>
          )}
      </div>
    </motion.aside>
  );
}