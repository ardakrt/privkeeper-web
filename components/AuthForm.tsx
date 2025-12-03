"use client";

import { useState, useEffect, useCallback, useMemo, createRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { getUserAuthInfo } from "@/app/actions";
import { sendVerificationCode, verifyDeviceCode, checkDeviceVerification } from "@/app/auth-actions";
import { useTheme } from "@/contexts/ThemeContext";
import { usePushLogin } from "@/hooks/usePushLogin";
import bcrypt from "bcryptjs";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

type Step = "emailInput" | "pinInput" | "pushWaiting" | "verificationInput";

interface AuthFormProps {
  initialEmail?: string;
  onStepChange?: (step: Step) => void;
}

export default function AuthForm({ initialEmail, onStepChange }: AuthFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { setTheme } = useTheme();
  const { requestPushLogin, isWaiting, error: pushError, cancelRequest, timeRemaining } = usePushLogin();

  const [step, setStep] = useState<Step>(initialEmail ? "pinInput" : "emailInput");
  const [email, setEmail] = useState(initialEmail || "");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  const pinRefs = useMemo(
    () => Array.from({ length: 6 }, () => createRef<HTMLInputElement>()),
    []
  );

  // Initial setup for direct PIN access
  useEffect(() => {
    if (initialEmail) {
      // Try to load from cache first for instant display
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem(`cached_user_${initialEmail}`);
        if (cachedUser) {
          try {
            const { name, avatarUrl } = JSON.parse(cachedUser);
            setUserName(name);
            setAvatarUrl(avatarUrl);
          } catch (e) {
            console.error("Error parsing cached user:", e);
          }
        }
      }

      const initTheme = async () => {
        try {
          const info = await getUserAuthInfo(initialEmail);
          if (info.theme === "light" || info.theme === "dark") {
            setTheme(info.theme);
            const root = document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(info.theme);
          }
          if (info.avatarUrl || info.userName) {
            setAvatarUrl(info.avatarUrl);
            setUserName(info.userName);
          }
        } catch { }
      };
      initTheme();
      // Focus PIN input
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    }
  }, [initialEmail, setTheme, pinRefs]);

  // Zamana göre selamlama
  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "Günaydın";
    if (hour >= 12 && hour < 17) return "İyi Günler";
    if (hour >= 17 && hour < 22) return "İyi Akşamlar";
    return "İyi Geceler";
  }

  // İsmin baş harfini büyük yap
  function capitalizeFirstLetter(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // E-posta adımı
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const info = await getUserAuthInfo(email.trim());

      // Kullanıcı bulunamadıysa kayıt sayfasına yönlendir
      if (!info.exists) {
        setLoading(false);
        setError("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Kayıt sayfasına yönlendiriliyorsunuz...");

        // 3 saniye sonra kayıt sayfasına yönlendir (kullanıcının mesajı okuması için)
        setTimeout(() => {
          router.push("/register");
        }, 2000);
        return;
      }

      // E-posta'ya göre tema/metadata
      if (info.theme === "light" || info.theme === "dark") {
        setTheme(info.theme);
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(info.theme);
      }
      if (info.avatarUrl || info.userName) {
        setAvatarUrl(info.avatarUrl);
        setUserName(info.userName);
      }

      // Kullanıcı varsa PIN girişine geç
      setStep("pinInput");
      setLoading(false);
      // PIN inputuna focus
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    } catch {
      setLoading(false);
      setError("Bir hata oluştu");
    }
  }

  // Kullanıcının avatar'ını Supabase'den çek
  useEffect(() => {
    if (step !== "pinInput" || !email) return;

    let isMounted = true;

    async function fetchUserInfo() {
      try {
        // Email'i hash'leyip Gravatar kullan (fallback)
        const emailHash = email.trim().toLowerCase();
        const gravatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=200`;

        const info = await getUserAuthInfo(email);
        if (isMounted) {
          setAvatarUrl(info.avatarUrl || gravatarUrl);
          setUserName(info.userName);
          if (info.theme === "light" || info.theme === "dark") {
            setTheme(info.theme);
            const root = document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(info.theme);
          }
        }
      } catch (err) {
        console.error("Kullanıcı bilgisi yüklenirken hata:", err);
      }
    }

    // Avatar/theme zaten set edildiyse ekstra istek açma
    if (!avatarUrl || !userName) {
      fetchUserInfo();
    }

    return () => {
      isMounted = false;
    };
  }, [step, email, avatarUrl, userName, setTheme]);

  // Email girilmeden önce (emailInput adımı) siyah/dark göster
  useEffect(() => {
    if (step === "emailInput") {
      try { setTheme("dark"); } catch { }
      const root = document.documentElement;
      root.classList.remove("light");
      if (!root.classList.contains("dark")) root.classList.add("dark");
    }
  }, [step, setTheme]);

  // PIN giriş fonksiyonu
  function handlePinChange(index: number, value: string) {
    // Sadece rakam kabul et
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Otomatik olarak bir sonraki input'a geç
    if (value && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  }

  // Backspace ile geri gitme
  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  }

  // Handle Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    // Check if pasted content is numeric
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split("").slice(0, 6);
      const newPin = [...pin];
      digits.forEach((digit, i) => {
        if (i < 6) newPin[i] = digit;
      });
      setPin(newPin);
      
      // Focus the next empty input or the last one if full
      const nextIndex = digits.length < 6 ? digits.length : 5;
      pinRefs[nextIndex].current?.focus();

      // If full code is pasted, trigger verification/login logic automatically?
      // The useEffect for fullPin will handle it.
    }
  };

  // PIN ile giriş (Otomatik)
  const handleLogin = useCallback(async () => {
    const fullPin = pin.join("");
    if (fullPin.length !== 6) return;

    setStatus("checking");
    setError(null);

    const normalized = fullPin.replace(/\D/g, "");

    try {
      // Step 1: Get user by email to retrieve user_id
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: normalized
      });

      // Fallback to legacy format if initial auth fails
      if (authError) {
        const legacy = `kp_${normalized}_2025`;
        const { data: legacyData, error: legacyError } = await supabase.auth.signInWithPassword({
          email,
          password: legacy
        });

        if (legacyError) {
          throw new Error("Auth failed");
        }

        // If legacy auth worked, verify against user_preferences
        if (legacyData?.user) {
          const userId = legacyData.user.id;
          await verifyPinFromDatabase(userId, normalized);
        }
      } else if (authData?.user) {
        // If normal auth worked, verify against user_preferences
        const userId = authData.user.id;
        await verifyPinFromDatabase(userId, normalized);
      }

      // Başarılı giriş
      setStatus("success");
      // Clear any cached PIN from localStorage/sessionStorage
      localStorage.removeItem('cached_pin');
      sessionStorage.removeItem('cached_pin');

      // Check device verification
      const isVerified = await checkDeviceVerification();
      if (isVerified) {
        // Tam sayfa yenileme ile sunucu çerezlerinin kesin senkronu
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 500);
      } else {
        // Send verification code and move to next step
        await sendVerificationCode(email);
        setStep("verificationInput");
        setPin(["", "", "", "", "", ""]); // Reset PIN state for the 6-digit code input
        setStatus("idle");
        // Focus first input
        setTimeout(() => pinRefs[0].current?.focus(), 100);
      }

    } catch (err) {
      console.error('Login Error:', err);
      // Hata durumu
      setStatus("error");
      setError("E-posta veya PIN hatalı");

      // Clear any cached PIN
      localStorage.removeItem('cached_pin');
      sessionStorage.removeItem('cached_pin');

      // 1 saniye bekle, sonra sıfırla
      setTimeout(() => {
        setPin(["", "", "", "", "", ""]);
        setStatus("idle");
        setError(null);
        pinRefs[0].current?.focus();
      }, 1000);
      return;
    }
  }, [email, pin, pinRefs, supabase]);

  // Initial session check for verification
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
         const isVerified = await checkDeviceVerification();
         if (!isVerified) {
           setEmail(session.user.email);
           // If we land here, we might want to auto-send code or wait for user action?
           // Let's assume if they are here, they need to verify.
           // But we don't want to spam codes on every reload.
           // We'll just set the step.
           setStep("verificationInput");
         }
      }
    };
    checkSession();
  }, [supabase]);

  // Verification Code Handler
  const handleVerification = useCallback(async () => {
    const code = pin.join("");
    if (code.length !== 6) return;

    setStatus("checking");
    setError(null);

    try {
      const result = await verifyDeviceCode(email, code, "browser-device-id"); // We can generate a real ID if needed
      
      if (result.success) {
        setStatus("success");
        window.location.assign("/dashboard");
      } else {
        setStatus("error");
        setError(result.message || "Doğrulama başarısız");
        setTimeout(() => {
          setPin(["", "", "", "", "", ""]);
          setStatus("idle");
          pinRefs[0].current?.focus();
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Bir hata oluştu");
      setTimeout(() => {
          setPin(["", "", "", "", "", ""]);
          setStatus("idle");
          pinRefs[0].current?.focus();
      }, 1000);
    }
  }, [email, pin, pinRefs]);

  // Helper function to verify PIN from user_preferences table
  async function verifyPinFromDatabase(userId: string, inputPin: string) {
    console.log('Verifying PIN from user_preferences for user:', userId);

    // Query user_preferences table
    const { data, error } = await supabase
      .from('user_preferences')
      .select('pin')
      .eq('user_id', userId)
      .single();

    console.log('PIN verification result:', data, error);

    if (error) {
      console.error('Error fetching user_preferences:', error);

      // Fallback: Check profiles table if user_preferences not found
      if (error.code === 'PGRST116') {
        console.log('No user_preferences found, checking profiles table as fallback');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('pin')
          .eq('id', userId)
          .single();

        if (profileError || !profileData?.pin) {
          console.error('No PIN found in profiles either');
          throw new Error('PIN not configured');
        }

        // Verify against profiles table
        const isValid = await bcrypt.compare(inputPin, profileData.pin);
        if (!isValid) {
          throw new Error('Invalid PIN');
        }
        return;
      }

      throw error;
    }

    if (!data?.pin) {
      console.error('No PIN hash found in user_preferences');
      throw new Error('PIN not configured');
    }

    // Verify the PIN using bcrypt
    const savedHash = data.pin;
    console.log('Comparing input PIN with saved hash...');
    const isValid = await bcrypt.compare(inputPin, savedHash);

    if (!isValid) {
      console.error('PIN verification failed');
      throw new Error('Invalid PIN');
    }

    console.log('PIN verified successfully!');
  }

  // Otomatik giriş kontrolü - 6 hane dolduğunda
  useEffect(() => {
    const fullPin = pin.join("");
    if (fullPin.length === 6 && status === "idle") {
      if (step === "pinInput") {
        handleLogin();
      } else if (step === "verificationInput") {
        handleVerification();
      }
    }
  }, [handleLogin, handleVerification, pin, status, step]);

  // Handle Push to Login
  const handlePushLogin = async () => {
    if (!email) return;
    setStep("pushWaiting");
    await requestPushLogin(email);
  };

  // Watch for push login errors
  useEffect(() => {
    if (pushError) {
      setError(pushError);
      setStep("emailInput");
    }
  }, [pushError]);

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {step === "emailInput" && (
          <motion.form
            key="emailInput"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleEmailSubmit}
            className="space-y-8"
          >
            {/* Başlık */}
            <motion.div variants={itemVariants} className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Keeper<span className="text-emerald-500">.</span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mt-2">Hesabınıza erişmek için giriş yapın</p>
            </motion.div>

            {/* E-posta Input */}
            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="email" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-1 uppercase tracking-wider">E-posta Adresi</label>
              <div className="relative group">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 6l8 6 8-6M4 6v12h16V6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="w-full h-12 pl-12 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300"
                  required
                />
              </div>
            </motion.div>

            {error && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            {/* Devam Et Butonu */}
            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Yükleniyor..." : "Devam Et"}
            </motion.button>

            {/* OR Divider */}
            <motion.div variants={itemVariants} className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-300 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-950 px-2 text-zinc-500 dark:text-zinc-400">
                  veya
                </span>
              </div>
            </motion.div>

            {/* Push to Login Button */}
            <motion.button
              variants={itemVariants}
              type="button"
              onClick={handlePushLogin}
              disabled={loading || !email}
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-transparent border-2 border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mobil Onay ile Giriş
            </motion.button>
          </motion.form>
        )}

        {step === "pinInput" && (
          <motion.div
            key="pinInput"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            {/* Avatar - Minimal ve Kişisel */}
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

              {/* Kişisel Selamlama */}
              {userName && (
                <div className="flex flex-col items-center space-y-3">
                  <p className="text-xl font-medium text-zinc-900 dark:text-white/90 text-center">
                    {getGreeting()}, {userName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Email ve kullanıcı bilgilerini sıfırla
                      setEmail("");
                      setUserName(null);
                      setAvatarUrl(null);
                      setPin(["", "", "", "", "", ""]);
                      setError(null);
                      setStep("emailInput");
                      // URL'deki email parametresini temizle
                      router.replace("/login", { scroll: false });
                    }}
                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  >
                    Yoksa {capitalizeFirstLetter(userName)} değil misin?
                  </button>
                </div>
              )}

              {/* PIN Input Kutucukları - Modern ve Şık */}
              <div
                className={`flex justify-center gap-2 transition-transform ${status === "error" ? "animate-shake" : ""
                  }`}
                style={
                  status === "error"
                    ? {
                      animation: "shake 0.5s ease-in-out",
                    }
                    : undefined
                }
              >
                {pin.map((digit, index) => {
                  let statusClasses = "";
                  if (status === "success") {
                    statusClasses = "border-green-500 text-green-500 ring-2 ring-green-500/50";
                  } else if (status === "error") {
                    statusClasses = "border-red-500 text-red-500 ring-2 ring-red-500/50";
                  } else if (status === "checking") {
                    statusClasses = "opacity-50 cursor-not-allowed";
                  } else {
                    statusClasses = "";
                  }

                  return (
                    <input
                      key={index}
                      ref={pinRefs[index]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={status === "checking" || status === "success"}
                      className={`w-10 h-14 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-center text-2xl font-bold rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300 ${statusClasses}`}
                    />
                  );
                })}
              </div>
            </motion.div>

            {error && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            {/* Giriş Yap Butonu */}
            <motion.button
              variants={itemVariants}
              onClick={handleLogin}
              disabled={status === "checking" || status === "success" || pin.join("").length !== 6}
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === "checking" ? "Giriş yapılıyor..." : status === "success" ? "Başarılı!" : "Giriş Yap"}
            </motion.button>

            {/* PIN Unuttum Linki */}
            <motion.div variants={itemVariants} className="text-center mt-2">
              <Link href="/forgot-pin" className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
                PIN kodumu unuttum
              </Link>
            </motion.div>
          </motion.div>
        )}

        {step === "verificationInput" && (
          <motion.div
            key="verificationInput"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="text-center space-y-2">
              <div className="w-20 h-20 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                E-posta Doğrulama
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                {email} adresine gönderilen 6 haneli kodu girin.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col items-center space-y-6">
              <div
                className={`flex justify-center gap-2 transition-transform ${status === "error" ? "animate-shake" : ""
                  }`}
                style={status === "error" ? { animation: "shake 0.5s ease-in-out" } : undefined}
              >
                {pin.map((digit, index) => {
                  let statusClasses = "";
                  if (status === "success") {
                    statusClasses = "border-green-500 text-green-500 ring-2 ring-green-500/50";
                  } else if (status === "error") {
                    statusClasses = "border-red-500 text-red-500 ring-2 ring-red-500/50";
                  } else if (status === "checking") {
                    statusClasses = "opacity-50 cursor-not-allowed";
                  } else {
                    statusClasses = "";
                  }

                  return (
                    <input
                      key={index}
                      ref={pinRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={status === "checking" || status === "success"}
                      className={`w-10 h-14 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-center text-2xl font-bold rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300 ${statusClasses}`}
                    />
                  );
                })}
              </div>
            </motion.div>

            {error && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            <motion.button
              variants={itemVariants}
              onClick={handleVerification}
              disabled={status === "checking" || status === "success" || pin.join("").length !== 6}
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === "checking" ? "Doğrulanıyor..." : status === "success" ? "Başarılı!" : "Doğrula"}
            </motion.button>

            <motion.div variants={itemVariants} className="text-center mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                   setResendStatus("Gönderiliyor...");
                   const res = await sendVerificationCode(email);
                   if (res.success) {
                     setResendStatus("Kod tekrar gönderildi.");
                   } else {
                     setResendStatus("Gönderilemedi: " + res.message);
                   }
                   // Clear message after 3 seconds
                   setTimeout(() => setResendStatus(null), 3000);
                }}
                className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Kodu tekrar gönder
              </button>
              
              {resendStatus && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-xs font-medium text-emerald-500"
                >
                  {resendStatus}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}

        {step === "pushWaiting" && (
          <motion.div
            key="pushWaiting"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            {/* Animated Phone Icon */}
            <motion.div variants={itemVariants} className="flex flex-col items-center space-y-6">
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                  className="w-24 h-24 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </motion.div>
                <motion.div
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full"
                />
              </div>

              {/* Title */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Mobil Onay Bekleniyor
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  Lütfen telefonunuzdan giriş isteğini onaylayın
                </p>
              </div>

              {/* Spinner */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-12 h-12 border-4 border-zinc-200 dark:border-white/10 border-t-emerald-500 rounded-full"
              />

              {/* Timer */}
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-sm font-mono font-semibold">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Info Text */}
              <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center max-w-xs">
                İstek 5 dakika içinde otomatik olarak iptal edilecek
              </p>
            </motion.div>

            {error && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </motion.div>
            )}

            {/* Cancel Button */}
            <motion.button
              variants={itemVariants}
              type="button"
              onClick={() => {
                cancelRequest();
                setStep("emailInput");
              }}
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-transparent border-2 border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white hover:border-red-500/50 hover:bg-red-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              İsteği İptal Et
            </motion.button>

            {/* Back to Login */}
            <motion.p variants={itemVariants} className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              PIN ile giriş yapmak için{" "}
              <button
                type="button"
                onClick={() => {
                  cancelRequest();
                  setStep("emailInput");
                }}
                className="text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300 font-medium transition-colors underline"
              >
                buraya tıklayın
              </button>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
