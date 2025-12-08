"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import AuthForm from "@/components/AuthForm";
import Image from "next/image";
import { motion } from "framer-motion";
import AuthContainer from "@/components/AuthContainer";

import { preloadUserData } from "@/app/actions/preload";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockedUser, setLockedUser] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [greeting, setGreeting] = useState("Merhaba");
  const supabase = createBrowserClient();

  // Check if this is a lock screen view
  const isLockScreen = searchParams?.get("view") === "locked";
  const [hideTabs, setHideTabs] = useState(!!searchParams?.get("email"));

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Günaydın");
    else if (hour >= 12 && hour < 17) setGreeting("İyi günler");
    else if (hour >= 17 && hour < 21) setGreeting("İyi akşamlar");
    else setGreeting("İyi geceler");
  }, []);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get the hash from URL
        const hash = window.location.hash;

        // Check if hash contains access_token and refresh_token
        if (hash && hash.includes("access_token") && hash.includes("refresh_token")) {
          console.log("🔐 Magic link tokens detected in URL hash");
          setIsProcessing(true);

          // Parse the hash manually
          const hashParams = new URLSearchParams(hash.substring(1)); // Remove '#' and parse
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("✅ Tokens extracted, setting session...");

            // Manually set the session
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("❌ Error setting session:", error);
              setIsProcessing(false);
              return;
            }

            if (data.session) {
              console.log("✅ Session set successfully, preloading data...");
              
              // Start preloading data immediately (fire and forget)
              preloadUserData(data.session.user.id);

              console.log("✅ Redirecting to dashboard...");
              // Clear the hash from URL
              window.location.hash = '';

              // Force hard redirect (more reliable than router.push with heavy hashes)
              window.location.href = '/dashboard';

              // Keep isProcessing true so spinner stays until page reloads
            } else {
              console.error("❌ No session returned after setSession");
              setIsProcessing(false);
            }
          } else {
            console.error("❌ Could not extract tokens from hash");
            setIsProcessing(false);
          }
        } else {
          // No hash tokens, check if user already has a session
          console.log("🔍 No tokens in hash, checking existing session...");

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            console.log("✅ Existing session found, preloading & redirecting...");
            // Preload data for existing session
            preloadUserData(session.user.id);
            
            router.push("/dashboard");
            router.refresh();
          } else {
            console.log("ℹ️ No existing session, showing login form");
          }
        }
      } catch (error) {
        console.error("💥 Error in handleAuth:", error);
        setIsProcessing(false);
      }
    };

    handleAuth();
  }, [router, supabase]);

  // Load locked user from localStorage
  useEffect(() => {
    if (isLockScreen && typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('locked_user');
      if (savedUser) {
        setLockedUser(JSON.parse(savedUser));
      }
    }
  }, [isLockScreen]);

  // Handle PIN submission
  const handlePinSubmit = async () => {
    if (!lockedUser) return;

    setPinError(false);

    // TODO: Validate PIN with your backend
    // For now, simulate authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: lockedUser.email,
      password: pin, // In real app, you'd validate PIN separately
    });

    if (error) {
      setPinError(true);
      setPin("");
      return;
    }

    if (data.user) {
      // Start preloading
      preloadUserData(data.user.id);
    }

    // Clear locked user and redirect
    localStorage.removeItem('locked_user');
    router.push("/dashboard");
    router.refresh();
  };

  // Render loading state while processing token
  if (isProcessing) {
    return (
      <div className="min-h-screen w-full relative bg-white dark:bg-black">
        {/* Light Mode Background - Only visible in light mode */}
        <div
          className="absolute inset-0 z-0 dark:hidden"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.15), transparent 70%), #fafafa",
          }}
        />
        {/* Dark Mode Background - Only visible in dark mode */}
        <div
          className="absolute inset-0 z-0 hidden dark:block"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.15), transparent 70%), #fafafa",
          }}
        />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/20 light:bg-white backdrop-blur-sm p-12 shadow-2xl text-center"
          >
            {/* Loading Spinner */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-white/10 dark:border-white/10 light:border-zinc-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-cyan-500 dark:border-t-cyan-500 light:border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
              <div>
                <p className="text-white dark:text-white light:text-zinc-900 text-xl font-semibold mb-2">Giriş yapılıyor...</p>
                <p className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 text-sm">Oturum açılıyor...</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render lock screen if view=locked
  if (isLockScreen && lockedUser) {
    return (
      <div className="min-h-screen w-full relative bg-white dark:bg-black">
        {/* Light Mode Background - Only visible in light mode */}
        <div
          className="absolute inset-0 z-0 dark:hidden"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.15), transparent 70%), #fafafa",
          }}
        />
        {/* Dark Mode Background - Only visible in dark mode */}
        <div
          className="absolute inset-0 z-0 hidden dark:block"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6, 182, 212, 0.25), transparent 70%), #000000",
          }}
        />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            {/* Lock Screen UI */}
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-white/20 shadow-2xl shadow-cyan-500/20"
              >
                {lockedUser.avatarUrl ? (
                  <Image
                    src={lockedUser.avatarUrl}
                    alt="Avatar"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {lockedUser.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Greeting */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white dark:text-white light:text-zinc-900 mb-2"
              >
                {greeting}, {lockedUser.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-zinc-400 dark:text-zinc-400 light:text-zinc-600 mb-8"
              >
                {lockedUser.email}
              </motion.p>

              {/* PIN Entry Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/20 light:bg-white backdrop-blur-sm p-8 shadow-2xl"
              >
                <div className="flex flex-col items-center">
                  <p className="text-zinc-300 dark:text-zinc-300 light:text-zinc-600 text-sm mb-6">PIN&apos;inizi girin</p>

                  {/* PIN Input Boxes */}
                  <div className="flex gap-3 mb-6">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${pinError
                          ? "border-red-500 bg-red-500/10 text-red-500"
                          : pin.length > index
                            ? "border-cyan-500 dark:border-cyan-500 light:border-emerald-500 bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-emerald-500/10 text-white dark:text-white light:text-zinc-900 shadow-lg shadow-cyan-500/20"
                            : "border-white/10 dark:border-white/10 light:border-zinc-200 bg-white/5 dark:bg-white/5 light:bg-zinc-50 text-zinc-600"
                          }`}
                      >
                        {pin.length > index && "•"}
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {pinError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-sm mb-4"
                    >
                      Geçersiz PIN. Lütfen tekrar deneyin.
                    </motion.p>
                  )}

                  {/* Number Pad */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          if (pin.length < 4) {
                            const newPin = pin + num;
                            setPin(newPin);
                            if (newPin.length === 4) {
                              setTimeout(() => handlePinSubmit(), 100);
                            }
                          }
                        }}
                        className="h-16 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-200 hover:border-white/20 text-white dark:text-white light:text-zinc-900 text-xl font-semibold transition-all active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <div /> {/* Empty space */}
                    <button
                      onClick={() => {
                        if (pin.length < 4) {
                          const newPin = pin + "0";
                          setPin(newPin);
                          if (newPin.length === 4) {
                            setTimeout(() => handlePinSubmit(), 100);
                          }
                        }
                      }}
                      className="h-16 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xl font-semibold transition-all active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={() => setPin(pin.slice(0, -1))}
                      className="h-16 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-100 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-200 hover:border-white/20 text-white dark:text-white light:text-zinc-900 transition-all active:scale-95"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Alternative Login Link */}
                  <button
                    onClick={() => {
                      localStorage.removeItem('locked_user');
                      router.push("/login");
                    }}
                    className="mt-6 text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 transition-colors"
                  >
                    Farklı hesapla giriş yap
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Render normal login form
  return (
    <AuthContainer hideTabs={hideTabs}>
      <AuthForm 
        initialEmail={searchParams?.get("email") || undefined} 
        onStepChange={(step) => setHideTabs(step !== "emailInput")}
      />
    </AuthContainer>
  );
}
