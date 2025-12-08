"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { verifyPin, sendPinResetEmail, checkPinExists } from "@/app/actions/auth-pin";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PinGuardProps {
  children: React.ReactNode;
  user: User | null;
}

export default function PinGuard({ children, user }: PinGuardProps) {
  const router = useRouter();
  const supabase = createBrowserClient();

  // Eğer kullanıcı yoksa direkt çocukları (muhtemelen login sayfası veya redirect) göster
  // Ancak dashboard layout altında olduğumuz için user muhtemelen var.
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pin Input State
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [greeting, setGreeting] = useState("Hoşgeldiniz");
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Günaydın");
    else if (hour >= 12 && hour < 18) setGreeting("İyi Günler");
    else if (hour >= 18 && hour < 22) setGreeting("İyi Akşamlar");
    else setGreeting("İyi Geceler");
  }, []);

  useEffect(() => {
    const checkPin = async () => {
      // 1. Check session storage
      const verified = sessionStorage.getItem("pinVerified");
      if (verified === "true") {
        setIsVerified(true);
        setIsLoading(false);
        return;
      }

      // 2. Check if user has a PIN
      if (user) {
        const { exists } = await checkPinExists();
        if (!exists) {
          // PIN yoksa oluşturmaya yönlendir
          router.push("/auth/update-pin?mode=create");
          return;
        }
      }
      
      setIsLoading(false);
    };

    checkPin();
  }, [user, router]);

  // Focus first input on load
  useEffect(() => {
    if (!isLoading && !isVerified && pinRefs.current[0]) {
      pinRefs.current[0].focus();
    }
  }, [isLoading, isVerified]);

  async function handleVerify() {
    setStatus("checking");
    setError(null);
    const fullPin = pin.join("");

    try {
      const res = await verifyPin(fullPin);
      if (res.success) {
        setStatus("success");
        sessionStorage.setItem("pinVerified", "true");
        setTimeout(() => {
          setIsVerified(true);
        }, 500);
      } else {
        setStatus("error");
        setError(res.message || "Hatalı PIN");
        setTimeout(() => {
          setStatus("idle");
          setPin(["", "", "", "", "", ""]);
          pinRefs.current[0]?.focus();
        }, 1000);
      }
    } catch (e) {
      setStatus("error");
      setError("Bir hata oluştu");
      setTimeout(() => {
        setStatus("idle");
        setPin(["", "", "", "", "", ""]);
      }, 1000);
    }
  }

  // Auto-submit
  useEffect(() => {
    const fullPin = pin.join("");
    if (fullPin.length === 6 && status === "idle") {
      handleVerify();
    }
  }, [pin, status]);

  async function handleLogout() {
    sessionStorage.removeItem("pinVerified");
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleForgotPin() {
    if (!user?.email) return;
    setResetStatus("sending");
    try {
      const res = await sendPinResetEmail(user.email);
      if (res.success) {
        setResetStatus("sent");
      } else {
        setResetStatus("error");
        setError(res.message || "Sıfırlama bağlantısı gönderilemedi");
        setTimeout(() => setResetStatus("idle"), 3000);
      }
    } catch (e) {
      setResetStatus("error");
    }
  }

  function handlePinChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split("").slice(0, 6);
      const newPin = [...pin];
      digits.forEach((digit, i) => {
        if (i < 6) newPin[i] = digit;
      });
      setPin(newPin);
      const nextIndex = digits.length < 6 ? digits.length : 5;
      pinRefs.current[nextIndex]?.focus();
    }
  };

  if (isLoading) {
    return <div className="h-full w-full bg-zinc-950" />; // Basit loading
  }

  if (isVerified) {
    return <>{children}</>;
  }

  // User info extraction
  const avatarUrl = user?.user_metadata?.avatar_url || null;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Kullanıcı";

  return (
    <div className="fixed inset-0 z-[100] min-h-screen w-full bg-white dark:bg-black overflow-hidden">
      {/* Light Mode Background - Only visible in light mode */}
      <div
        className="absolute inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: "radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #10b981 100%)",
          backgroundSize: "100% 100%",
        }}
      />
      {/* Dark Mode Background - Only visible in dark mode */}
      <div
        className="absolute inset-0 z-0 hidden dark:block"
        style={{
          background: "radial-gradient(150% 150% at 50% 100%, #000000 40%, #299690ff 100%)"
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="relative rounded-3xl border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex flex-col items-center space-y-8">
              {/* Avatar */}
              <div className="w-32 h-32 bg-zinc-100 dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center overflow-hidden shadow-2xl relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-zinc-100 dark:from-emerald-900 dark:to-zinc-900 text-4xl font-bold text-emerald-600 dark:text-emerald-500/50">
                      {userName.charAt(0).toUpperCase()}
                   </div>
                )}
              </div>

              {/* Greeting */}
              <div className="text-center space-y-2">
                 <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                   {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{userName}</span>
                 </h2>
                 <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  Yoksa {userName.charAt(0).toUpperCase() + userName.slice(1)} değil misin?
                </button>
              </div>

              {/* PIN Input */}
              <div className={`flex justify-center gap-2 ${status === "error" ? "animate-shake" : ""}`}>
                 {pin.map((digit, index) => {
                   const isError = status === "error";
                   const isSuccess = status === "success";
                   
                   return (
                     <input
                       key={index}
                       ref={el => { pinRefs.current[index] = el }}
                       type="password"
                       inputMode="numeric"
                       maxLength={1}
                       value={digit}
                       onChange={(e) => handlePinChange(index, e.target.value)}
                       onKeyDown={(e) => handlePinKeyDown(index, e)}
                       onPaste={handlePaste}
                       disabled={status === "checking" || isSuccess}
                       className={`
                         w-10 h-14 border text-center text-2xl font-bold rounded-xl
                         focus:outline-none focus:ring-2 transition-all duration-300
                         ${isError 
                           ? "border-red-500 text-red-500 bg-red-50 dark:bg-red-500/10 focus:border-red-500 focus:ring-red-500/20" 
                           : isSuccess
                             ? "border-emerald-500 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 focus:border-emerald-500 focus:ring-emerald-500/20"
                             : "bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white focus:border-emerald-500/50 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10"
                         }
                       `}
                     />
                   );
                 })}
              </div>

              {/* Forgot PIN Button / Status */}
              <div className="text-center">
                {resetStatus === "sent" ? (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full text-sm font-medium">
                      <CheckCircle2 size={16} />
                      <span>Sıfırlama bağlantısı gönderildi</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">E-posta kutunuzu kontrol edin.</p>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleForgotPin}
                    disabled={resetStatus === "sending"}
                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-4 transition-colors disabled:opacity-50"
                  >
                    {resetStatus === "sending" ? "Gönderiliyor..." : "PIN kodumu unuttum"}
                  </button>
                )}
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20"
                  >
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
