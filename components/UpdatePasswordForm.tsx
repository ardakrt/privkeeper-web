"use client";

import { useState, useTransition } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { updateUserPassword } from "@/app/actions";
import { toast } from "react-hot-toast";
import { AlertCircle, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface UpdatePasswordFormProps {
  onBack: () => void;
}

export default function UpdatePasswordForm({ onBack }: UpdatePasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserClient();

  const handleSubmit = async (formData: FormData) => {
    setError(null);

    if (newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    // 1. Verify current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email || "",
      password: currentPassword
    });

    if (signInError) {
      setError("Mevcut şifreniz hatalı.");
      return;
    }

    // 2. Update password via Server Action
    startTransition(async () => {
      try {
        await updateUserPassword(formData);
        toast.success("Şifre başarıyla değiştirildi!");
        onBack();
      } catch (e: any) {
        setError("Şifre güncellenemedi: " + e.message);
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-white/10 overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            ← Geri
          </button>
          <div className="w-10 h-10 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-center shadow-inner">
            <Lock className="w-5 h-5 text-zinc-900 dark:text-white" strokeWidth={1.5} />
          </div>
          <div className="w-8" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-center text-zinc-900 dark:text-white mb-2">
          Parola Değiştir
        </h1>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Hesap güvenliğiniz için güçlü bir parola belirleyin.
        </p>

        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* Current Password */}
            <div className="relative group">
              <input
                type={showCurrent ? "text" : "password"}
                placeholder="Mevcut Parola"
                className="w-full h-12 px-4 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-12"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* New Password */}
            <div className="relative group">
              <input
                name="new_password"
                type={showNew ? "text" : "password"}
                placeholder="Yeni Parola"
                className="w-full h-12 px-4 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-12"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm New Password */}
            <div className="relative group">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Yeni Parola (Tekrar)"
                className="w-full h-12 px-4 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-[0.98]"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Parolayı Güncelle"
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
