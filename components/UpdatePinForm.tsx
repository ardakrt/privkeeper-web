"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { updateUserPin } from "@/app/actions";

interface UpdatePinFormProps {
  onBack?: () => void;
}

export default function UpdatePinForm({ onBack }: UpdatePinFormProps) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Refs for focus management
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const confirmPinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinChange = (
    index: number,
    value: string,
    state: string[],
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<HTMLInputElement | null>[]
  ) => {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...state];
    newPin[index] = value;
    setState(newPin);
    if (value && index < 5) {
      refs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    state: string[],
    refs: React.MutableRefObject<HTMLInputElement | null>[]
  ) => {
    if (e.key === "Backspace" && !state[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<HTMLInputElement | null>[]
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split("").slice(0, 6);
      const newPin = Array(6).fill("");
      digits.forEach((digit, i) => {
        if (i < 6) newPin[i] = digit;
      });
      setState(newPin);
      const nextIndex = digits.length < 6 ? digits.length : 5;
      refs[nextIndex].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fullPin = pin.join("");
    const fullConfirmPin = confirmPin.join("");

    if (fullPin.length !== 6) {
      setErrorMessage("PIN kodu 6 haneli olmalıdır.");
      return;
    }

    if (fullPin !== fullConfirmPin) {
      setErrorMessage("PIN kodları eşleşmiyor.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("new_pin", fullPin);
    formData.append("confirm_pin", fullConfirmPin);
    // Ekstra parametre: Sadece PIN hash'ini güncelle
    formData.append("update_auth_password", "false");

    try {
      // Server action ile PIN'i güncelle
      await updateUserPin(formData);
      setStatus("success");
      
      // 2 saniye sonra geri dön
      setTimeout(() => {
        if (onBack) onBack();
        else router.push("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setErrorMessage("PIN güncellenemedi. Lütfen tekrar deneyin.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-white/10 p-8 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white mb-2">PIN Güncellendi!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">Yeni PIN kodunuz başarıyla oluşturuldu.</p>
        </motion.div>
      </div>
    );
  }

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
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-center text-zinc-900 dark:text-white mb-2">
          Yeni PIN Belirle
        </h1>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Güvenliğiniz için 6 haneli yeni bir kod oluşturun.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            {/* PIN */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 text-center uppercase tracking-wider">Yeni PIN</label>
              <div className="flex justify-center gap-2">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, pin, setPin, pinRefs)}
                    onKeyDown={(e) => handlePinKeyDown(index, e, pin, pinRefs)}
                    onPaste={(e) => handlePaste(e, setPin, pinRefs)}
                    className="w-12 h-14 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Confirm PIN */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 text-center uppercase tracking-wider">PIN Tekrar</label>
              <div className="flex justify-center gap-2">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    ref={confirmPinRefs[index]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, confirmPin, setConfirmPin, confirmPinRefs)}
                    onKeyDown={(e) => handlePinKeyDown(index, e, confirmPin, confirmPinRefs)}
                    onPaste={(e) => handlePaste(e, setConfirmPin, confirmPinRefs)}
                    className="w-12 h-14 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                  />
                ))}
              </div>
            </div>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }}
              className="bg-red-50/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{errorMessage}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || pin.join("").length !== 6 || confirmPin.join("").length !== 6}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-[0.98]"
          >
            {status === "loading" ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "PIN'i Güncelle"
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
