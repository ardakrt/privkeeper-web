import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { sendVerificationCode, verifyAndCompleteRegistration } from "@/app/auth-actions";
import { motion, AnimatePresence, easeOut, easeIn } from "framer-motion";
import { AlertCircle } from "lucide-react";


type Step = "emailInput" | "detailsInput" | "verificationInput";

interface RegisterFormProps {
  onStepChange?: (step: Step) => void;
  backTrigger?: number;
}

export default function RegisterForm({ onStepChange, backTrigger }: RegisterFormProps) {
  const [step, setStep] = useState<Step>("emailInput");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]); // Separate state for OTP
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Step değiştiğinde parent'a bildir
  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  // Geri butonu tetiklendiğinde
  useEffect(() => {
    if (backTrigger && backTrigger > 0) {
      if (step === "detailsInput") {
        setStep("emailInput");
      } else if (step === "verificationInput") {
        setStep("detailsInput");
        setVerificationCode(["", "", "", "", "", ""]); // Reset OTP
        setError(null);
      }
    }
  }, [backTrigger, step]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  
  // Avatar seçimi
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // E-posta adımı
  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("E-posta adresi gereklidir");
      return;
    }
    setError(null);
    setStep("detailsInput");
  }

  // Generic Pin Change Handler
  function handleGenericPinChange(
    index: number, 
    value: string, 
    state: string[], 
    setState: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    if (value && !/^\d$/.test(value)) return;
    const newPin = [...state];
    newPin[index] = value;
    setState(newPin);
    if (value && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  }

  function handleGenericPinKeyDown(
    index: number, 
    e: React.KeyboardEvent<HTMLInputElement>, 
    state: string[]
  ) {
    if (e.key === "Backspace" && !state[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, setState: React.Dispatch<React.SetStateAction<string[]>>) => {
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
      pinRefs[nextIndex].current?.focus();
    }
  };

  // Kayıt işlemi BAŞLATMA (Detaylar adımından -> Doğrulama Adımına)
  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasyon
    if (!name.trim()) {
      setError("Lütfen adınızı girin");
      return;
    }
    const fullPin = pin.join("");
    if (fullPin.length !== 6) {
      setError("PIN 6 haneli olmalıdır");
      return;
    }

    setLoading(true);

    try {
      console.log("Sending OTP to:", email);
      // Send verification code
      const res = await sendVerificationCode(email.trim(), true); // true = Registration flow
      
      console.log("OTP Response:", res);

      if (!res.success) {
         throw new Error(res.message || "Kod gönderilemedi");
      }

      setStep("verificationInput");
      setLoading(false);
      // Focus first input
      setTimeout(() => pinRefs[0].current?.focus(), 100);

    } catch (err: any) {
      console.error("Register Error:", err);
      setLoading(false);
      setError(err.message || "Bir hata oluştu");
    }
  }

  // Final Registration (Verify Code + Set Data in one action)
  async function handleFinalRegister() {
    const code = verificationCode.join("");
    if (code.length !== 6) return;
    
    setLoading(true);
    setError(null);

    try {
      // Verify and complete registration in one server action
      const result = await verifyAndCompleteRegistration(
        email,
        code,
        name,
        pin.join(""),
        avatarFile
      );
      
      if (!result.success) {
        throw new Error(result.message || "Kayıt tamamlanamadı");
      }

      // Redirect to dashboard
      if (result.redirect) {
        window.location.href = result.redirect;
      }

    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Kayıt tamamlanamadı");
    }
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: easeOut,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      x: -20,
      transition: { duration: 0.3, ease: easeIn }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ADIM 1: E-POSTA */}
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
            {/* ... (Header and Email Input same as before) ... */}
             <motion.div variants={itemVariants} className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Keeper<span className="text-emerald-500">.</span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mt-2">Hesap oluşturmak için kayıt olun</p>
            </motion.div>

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

            {error && <motion.p variants={itemVariants} className="text-sm text-red-400 text-center">{error}</motion.p>}

            <motion.button
              variants={itemVariants}
              type="submit"
              className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Devam Et
            </motion.button>
          </motion.form>
        )}

        {/* ADIM 2: DETAYLAR */}
        {step === "detailsInput" && (
          <motion.form
            key="detailsInput"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleDetailsSubmit} // Changed handler
            autoComplete="off"
            className="space-y-8"
          >
             {/* ... (Avatar, Name, PIN inputs same as before) ... */}
             <motion.div variants={itemVariants} className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Keeper<span className="text-emerald-500">.</span>
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mt-2">Profilinizi oluşturun</p>
            </motion.div>

            <div className="flex flex-col items-center space-y-8">
              {/* Avatar */}
              <motion.div variants={itemVariants} className="flex flex-col items-center space-y-3">
                <label 
                  htmlFor="avatar-upload" 
                  className="group relative w-32 h-32 bg-zinc-100 dark:bg-white/5 border-4 border-zinc-300 dark:border-white/10 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-400 transition-all shadow-2xl"
                >
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" width={128} height={128} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-zinc-400 dark:text-white/40 group-hover:text-emerald-500/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-bold text-xs bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">Değiştir</span>
                  </div>
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </motion.div>

              {/* Name */}
              <motion.div variants={itemVariants} className="w-full space-y-2">
                <label htmlFor="name" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 ml-1 uppercase tracking-wider">Ad Soyad</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adınız Soyadınız" autoComplete="new-password" className="w-full h-12 px-4 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300" required />
              </motion.div>

              {/* PIN */}
              <motion.div variants={itemVariants} className="w-full space-y-4">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white text-center">6 Haneli PIN Oluşturun</h3>
                <div className="flex justify-center gap-2">
                  {pin.map((digit, index) => (
                    <input key={index} ref={pinRefs[index]} type="password" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleGenericPinChange(index, e.target.value, pin, setPin)} onKeyDown={(e) => handleGenericPinKeyDown(index, e, pin)} onPaste={(e) => handlePaste(e, setPin)} autoComplete="new-password" className="w-10 h-14 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-center text-2xl font-bold rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300" />
                  ))}
                </div>
              </motion.div>
            </div>

            {error && <motion.p variants={itemVariants} className="text-sm text-red-400 text-center">{error}</motion.p>}

            <motion.button variants={itemVariants} type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {loading ? "İşleniyor..." : "Devam Et"}
            </motion.button>
          </motion.form>
        )}

        {/* ADIM 3: DOĞRULAMA */}
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
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">E-posta Doğrulama</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                {email} adresine gönderilen 6 haneli kodu girin.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col items-center space-y-6">
               <div className="flex justify-center gap-2">
                  {verificationCode.map((digit, index) => (
                    <input key={index} ref={pinRefs[index]} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleGenericPinChange(index, e.target.value, verificationCode, setVerificationCode)} onKeyDown={(e) => handleGenericPinKeyDown(index, e, verificationCode)} onPaste={(e) => handlePaste(e, setVerificationCode)} className="w-10 h-14 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-zinc-900 dark:text-white text-center text-2xl font-bold rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:bg-zinc-50 dark:focus:bg-white/10 transition-all duration-300" />
                  ))}
                </div>
            </motion.div>

            {error && <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-400 font-medium">{error}</p></motion.div>}

            <motion.button variants={itemVariants} onClick={handleFinalRegister} disabled={loading || verificationCode.join("").length !== 6} className="w-full h-12 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
              {loading ? "Kaydediliyor..." : "Kaydı Tamamla"}
            </motion.button>

            <motion.div variants={itemVariants} className="text-center mt-2 flex flex-col gap-2">
              <button type="button" onClick={async () => { setResendStatus("Gönderiliyor..."); const res = await sendVerificationCode(email); if (res.success) { setResendStatus("Kod tekrar gönderildi."); } else { setResendStatus("Hata: " + res.message); } setTimeout(() => setResendStatus(null), 3000); }} className="text-sm text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Kodu tekrar gönder</button>
              {resendStatus && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-xs font-medium text-emerald-500">{resendStatus}</motion.p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
