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
  ListTodo, // Todo İkonu
  HardDrive // Drive İkonu
} from "lucide-react";

const navigationItems = [
  { name: "Notlar", href: "/dashboard/notes", icon: StickyNote },
  { name: "Görevler", href: "/dashboard/todos", icon: ListTodo }, // YENİ EKLENDİ
  { name: "Cüzdan", href: "/dashboard/wallet", icon: Wallet },
  { name: "Abonelikler", href: "/dashboard/subscriptions", icon: Receipt },
  { name: "Hatırlatıcılar", href: "/dashboard/reminders", icon: Bell },
  { name: "Zamanlayıcı", href: "/dashboard/timer", icon: Timer },
  { name: "Authenticator", href: "/dashboard/authenticator", icon: Shield },
  { name: "Drive", href: "/dashboard/drive", icon: HardDrive }, // DRIVE (En altta veya arada olabilir)
];

export default function FloatingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
      className="fixed left-4 top-4 bottom-6 z-50 flex flex-col rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-3xl backdrop-saturate-150 shadow-2xl shadow-black/50 overflow-hidden relative"
    >
      {/* --- AMBIYANS IŞIĞI --- */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/20 via-blue-500/5 to-transparent blur-3xl pointer-events-none opacity-60" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-50" />

      {/* --- Header Alanı (LOGO) --- */}
      <div className={`relative z-10 px-0 pt-10 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
        <div
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 group cursor-pointer select-none"
        >
          <div className="flex items-center justify-center">
            {isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-bold text-white tracking-tighter"
              >
                K<span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">.</span>
              </motion.span>
            )}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-2xl font-bold text-white tracking-tight leading-none group-hover:text-zinc-200 transition-colors">
                    Keeper<span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">.</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- Navigasyon --- */}
      <nav className="relative z-10 flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                title={isCollapsed ? item.name : ""}
                className={`
                  relative flex items-center gap-3 px-3 py-3 rounded-2xl
                  transition-all duration-300 cursor-pointer group
                  ${isCollapsed ? "justify-center" : ""}
                  ${isActive
                    ? "text-black"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 rounded-2xl bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] backdrop-blur-md"
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
                    className={isActive ? "text-black" : "text-zinc-400 group-hover:text-white"}
                  />
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative z-10 text-[15px] font-bold tracking-tight whitespace-nowrap overflow-hidden ml-1"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* --- Footer & Toggle --- */}
      <div className="relative z-10 p-4 pb-8 flex flex-col gap-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`
            w-full flex items-center justify-center py-3 rounded-xl 
            bg-white/5 border border-white/5 
            text-zinc-400 hover:text-white hover:bg-white/10 
            transition-all duration-300 group
          `}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {!isCollapsed ? (
          <div className="relative bg-white/5 rounded-2xl p-1.5 border border-white/5 flex items-center backdrop-blur-sm">
            <motion.div
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-xl shadow-sm border border-white/5"
              animate={{ x: theme === "light" ? 0 : "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={(e) => theme !== "light" && toggleTheme(e)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl relative z-10 transition-colors ${theme === "light" ? "text-white" : "text-zinc-500"}`}
            >
              <Sun size={16} />
              <span className="text-xs font-medium">Light</span>
            </button>
            <button
              onClick={(e) => theme !== "dark" && toggleTheme(e)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl relative z-10 transition-colors ${theme === "dark" ? "text-white" : "text-zinc-500"}`}
            >
              <Moon size={16} />
              <span className="text-xs font-medium">Dark</span>
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => toggleTheme(e)}
            className="w-full py-3 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:text-white text-zinc-500 border border-white/5"
          >
            {theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>
    </motion.aside>
  );
}