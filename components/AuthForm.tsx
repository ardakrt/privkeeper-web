"use client";

import { useState, useEffect, useCallback, useMemo, createRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { getUserAuthInfo } from "@/app/actions";
import { sendVerificationCode, verifyDeviceCode, checkDeviceVerification } from "@/app/auth-actions";
import { useTheme } from "@/contexts/ThemeContext";
import { usePushLogin } from "@/hooks/usePushLogin";
import { AnimatePresence } from "framer-motion";
import { resetPassword } from "@/app/auth-actions";
import { toast } from "react-hot-toast";

// ... inside AuthForm component ...

  // In render:
  // Find the "Forgot Password" link. It should be near the password input.
  // Assuming step === "password" or similar.

// Import Refactored Components
import StepEmail from "./auth/StepEmail";
import StepPassword from "./auth/StepPassword";
import Step2FA from "./auth/Step2FA";

type Step = "emailInput" | "passwordInput" | "pushWaiting" | "verificationInput";

interface AuthFormProps {
  initialEmail?: string;
  onStepChange?: (step: Step) => void;
}

export default function AuthForm({ initialEmail, onStepChange }: AuthFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const { setTheme } = useTheme();
  const { requestPushLogin, isWaiting, error: pushError, cancelRequest, timeRemaining } = usePushLogin();

  const handleForgotPassword = async () => {
    if (!email) {
      router.push("/forgot-password");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("email", email);
      const res = await resetPassword(formData);
      
      if (res.success) {
        toast.success("Şifre sıfırlama bağlantısı e-postanıza gönderildi.");
      } else {
        toast.error(res.message || "Sıfırlama bağlantısı gönderilemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // State
  const [step, setStep] = useState<Step>(initialEmail ? "passwordInput" : "emailInput");
  const [email, setEmail] = useState(initialEmail || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  
  // 2FA Pin State (Only for Verification Code)
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const pinRefs = useMemo(() => Array.from({ length: 6 }, () => createRef<HTMLInputElement>()), []);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  // Initial setup
  useEffect(() => {
    if (initialEmail) {
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
    }
  }, [initialEmail, setTheme]);

  // Zamana göre selamlama
  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "Günaydın";
    if (hour >= 12 && hour < 17) return "İyi Günler";
    if (hour >= 17 && hour < 22) return "İyi Akşamlar";
    return "İyi Geceler";
  }

  // E-posta adımı
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const info = await getUserAuthInfo(email.trim());

      if (!info.exists) {
        setLoading(false);
        setError("Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Kayıt sayfasına yönlendiriliyorsunuz...");
        setTimeout(() => {
          router.push("/register");
        }, 2000);
        return;
      }

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

      setStep("passwordInput");
      setLoading(false);
    } catch {
      setLoading(false);
      setError("Bir hata oluştu");
    }
  }

  // Kullanıcının avatar'ını Supabase'den çek
  useEffect(() => {
    if (step !== "passwordInput" || !email) return;

    let isMounted = true;

    async function fetchUserInfo() {
      try {
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

    if (!avatarUrl || !userName) {
      fetchUserInfo();
    }

    return () => {
      isMounted = false;
    };
  }, [step, email, avatarUrl, userName, setTheme]);

  // Email girilmeden önce siyah/dark göster
  useEffect(() => {
    if (step === "emailInput") {
      try { setTheme("dark"); } catch { }
      const root = document.documentElement;
      root.classList.remove("light");
      if (!root.classList.contains("dark")) root.classList.add("dark");
    }
  }, [step, setTheme]);

  // Şifre ile giriş (Standard Supabase Auth)
  const handleLogin = useCallback(async (password: string) => {
    setStatus("checking");
    setError(null);

    try {
      // Authenticate directly with Supabase (No custom PIN logic anymore)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      setStatus("success");

      // 2FA / Cihaz Doğrulama Kontrolü
      const isVerified = await checkDeviceVerification();
      if (isVerified) {
        setTimeout(() => {
          window.location.assign("/dashboard");
        }, 500);
      } else {
        // Send OTP Code
        await sendVerificationCode(email);
        setStep("verificationInput");
        setStatus("idle");
        // Reset 2FA pins
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => pinRefs[0].current?.focus(), 100);
      }

    } catch (err: any) {
      console.error('Login Error:', err);
      setStatus("error");
      setError("E-posta veya şifre hatalı.");
      setTimeout(() => {
        setStatus("idle");
        setError(null);
      }, 2000);
    }
  }, [email, supabase, pinRefs]);

  // 2FA Input Logic
  function handlePinChange(index: number, value: string) {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
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
      pinRefs[nextIndex].current?.focus();
    }
  };

  const handleVerification = useCallback(async () => {
    const code = pin.join("");
    if (code.length !== 6) return;

    setStatus("checking");
    setError(null);

    try {
      const result = await verifyDeviceCode(email, code, "browser-device-id");
      
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

  // Auto-submit for 2FA code
  useEffect(() => {
    const fullCode = pin.join("");
    if (fullCode.length === 6 && step === "verificationInput" && status === "idle") {
      handleVerification();
    }
  }, [pin, step, status, handleVerification]); // Added handleVerification to deps

  const handlePushLogin = async () => {
    if (!email) return;
    setStep("pushWaiting");
    await requestPushLogin(email);
  };

  useEffect(() => {
    if (pushError) {
      setError(pushError);
      setStep("emailInput");
    }
  }, [pushError]);

  const handleResendCode = async () => {
    setResendStatus("Gönderiliyor...");
    const res = await sendVerificationCode(email);
    if (res.success) {
      setResendStatus("Kod tekrar gönderildi.");
    } else {
      setResendStatus("Gönderilemedi: " + res.message);
    }
    setTimeout(() => setResendStatus(null), 3000);
  };

  const handleReset = () => {
    setEmail("");
    setUserName(null);
    setAvatarUrl(null);
    setError(null);
    setStep("emailInput");
    router.replace("/login", { scroll: false });
  };

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
          <StepEmail 
            email={email}
            onEmailChange={setEmail}
            onSubmit={handleEmailSubmit}
            onPushLogin={handlePushLogin}
            loading={loading}
            error={error}
            variants={containerVariants}
            itemVariants={itemVariants}
          />
        )}

        {step === "passwordInput" && (
          <StepPassword 
            avatarUrl={avatarUrl}
            userName={userName}
            email={email}
            greeting={getGreeting()}
            status={status}
            error={error}
            onLogin={handleLogin}
            onReset={handleReset}
            onForgotPassword={handleForgotPassword}
            variants={containerVariants}
            itemVariants={itemVariants}
          />
        )}

        {(step === "pushWaiting" || step === "verificationInput") && (
          <Step2FA 
            type={step}
            email={email}
            pin={pin}
            pinRefs={pinRefs}
            status={status}
            error={error}
            timeRemaining={timeRemaining}
            resendStatus={resendStatus}
            onPinChange={handlePinChange}
            onPinKeyDown={handlePinKeyDown}
            onPaste={handlePaste}
            onVerification={handleVerification}
            onResend={handleResendCode}
            onCancel={() => {
              cancelRequest();
              setStep("emailInput");
            }}
            variants={containerVariants}
            itemVariants={itemVariants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}