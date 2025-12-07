import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

interface StepPasswordProps {
  avatarUrl: string | null;
  userName: string | null;
  email: string;
  greeting: string;
  status: "idle" | "checking" | "success" | "error";
  error: string | null;
  forgotPasswordSent?: boolean;
  onLogin: (password: string) => void;
  onReset: () => void;
  onForgotPassword: () => void;
  variants: any;
  itemVariants: any;
}

export default function StepPassword({
  avatarUrl,
  userName,
  email,
  greeting,
  status,
  error,
  forgotPasswordSent,
  onLogin,
  onReset,
  onForgotPassword,
  variants,
  itemVariants
}: StepPasswordProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length >= 6) {
      onLogin(password);
    }
  };

  if (forgotPasswordSent) {
    return (
      <motion.div
        key="forgotSuccess"
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="space-y-6 text-center"
      >
        <motion.div variants={itemVariants} className="flex justify-center">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="space-y-2">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">E-posta Gönderildi!</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Şifre sıfırlama bağlantısını <strong>{email}</strong> adresine gönderdik.
          </p>
        </motion.div>
        <motion.button
          variants={itemVariants}
          onClick={onReset}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors underline underline-offset-4"
        >
          Giriş ekranına dön
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="passwordInput"
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-8"
    >
      {/* Avatar */}
      <motion.div variants={itemVariants} className="flex flex-col items-center space-y-6">
        <div className="w-32 h-32 bg-zinc-100 dark:bg-white/5 border-4 border-zinc-300 dark:border-white/10 rounded-full flex items-center justify-center overflow-hidden shadow-2xl">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-zinc-400 dark:text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
        </div>

        {/* Selamlama */}
        <div className="flex flex-col items-center space-y-3">
          <p className="text-xl font-medium text-zinc-900 dark:text-white/90 text-center">
            {userName ? `${greeting}, ${userName}` : greeting}
          </p>
          {!userName && email && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
          )}
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            {userName ? `Yoksa ${capitalizeFirstLetter(userName)} değil misin?` : "Yoksa sen değil misin?"}
          </button>
        </div>
      </motion.div>

      {/* Password Input */}
      <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <input
            ref={inputRef}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifreniz"
            className={`w-full h-12 px-4 bg-zinc-800/50 border-2 border-zinc-700 text-white placeholder:text-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500 transition-all ${
              status === "error" ? "border-red-500" : ""
            }`}
            disabled={status === "checking" || status === "success"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === "checking" || status === "success" || password.length < 6}
          className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {status === "checking" ? "Giriş yapılıyor..." : status === "success" ? "Başarılı!" : "Giriş Yap"}
        </button>
      </motion.form>

      {/* Forgot Password Link */}
      <motion.div variants={itemVariants} className="text-center">
        <button 
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Şifremi unuttum
        </button>
      </motion.div>
    </motion.div>
  );
}
