"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Lock, Unlock, Eye, EyeOff } from "lucide-react";

interface WalletPinSettingsProps {
  enabled: boolean;
}

export default function WalletPinSettings({ enabled: initialEnabled }: WalletPinSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"set" | "change" | "disable">("set");

  const supabase = createBrowserClient();

  const handleToggle = async () => {
    if (!isEnabled) {
      // PIN'i aktifleştir - PIN belirleme modalı aç
      setMode("set");
      setPin("");
      setConfirmPin("");
      setShowPinModal(true);
    } else {
      // PIN'i devre dışı bırak - onay iste
      setMode("disable");
      setPin("");
      setShowPinModal(true);
    }
  };

  const handleSetPin = async () => {
    if (mode === "set" || mode === "change") {
      if (pin.length < 4) {
        toast.error("PIN en az 4 haneli olmalıdır");
        return;
      }
      if (pin !== confirmPin) {
        toast.error("PIN'ler eşleşmiyor");
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı");

      if (mode === "disable") {
        // Mevcut PIN'i doğrula
        const { data: pref } = await supabase
          .from("user_preferences")
          .select("wallet_pin")
          .eq("user_id", user.id)
          .single();

        if (pref?.wallet_pin !== pin) {
          toast.error("Yanlış PIN");
          setIsLoading(false);
          return;
        }

        // PIN'i devre dışı bırak
        const { error } = await supabase
          .from("user_preferences")
          .update({ wallet_pin_enabled: false, wallet_pin: null })
          .eq("user_id", user.id);

        if (error) throw error;

        setIsEnabled(false);
        toast.success("Cüzdan PIN koruması kaldırıldı");
      } else {
        // PIN'i kaydet
        const { error } = await supabase
          .from("user_preferences")
          .update({ wallet_pin_enabled: true, wallet_pin: pin })
          .eq("user_id", user.id);

        if (error) throw error;

        setIsEnabled(true);
        toast.success("Cüzdan PIN koruması aktif");
      }

      setShowPinModal(false);
      setPin("");
      setConfirmPin("");
    } catch (error) {
      console.error("PIN ayarlama hatası:", error);
      toast.error("Bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (value: string, field: "pin" | "confirm") => {
    // Sadece rakam kabul et
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    if (field === "pin") {
      setPin(numericValue);
    } else {
      setConfirmPin(numericValue);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-emerald-500/10' : 'bg-zinc-500/10'}`}>
            {isEnabled ? (
              <Lock className="w-5 h-5 text-emerald-500" />
            ) : (
              <Unlock className="w-5 h-5 text-zinc-500" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium dark:text-white light:text-zinc-900">Cüzdan PIN Koruması</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {isEnabled 
                ? "Cüzdana girerken PIN sorulacak" 
                : "Cüzdanı PIN ile koruyun"}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
            isEnabled ? 'bg-emerald-500' : 'bg-zinc-600'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
              isEnabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isEnabled && (
        <button
          onClick={() => {
            setMode("change");
            setPin("");
            setConfirmPin("");
            setShowPinModal(true);
          }}
          className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors ml-4"
        >
          PIN'i Değiştir
        </button>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold dark:text-white light:text-zinc-900">
                  {mode === "disable" ? "PIN'i Kaldır" : mode === "change" ? "PIN'i Değiştir" : "PIN Belirle"}
                </h2>
                <p className="text-xs text-zinc-500">
                  {mode === "disable" ? "Mevcut PIN'inizi girin" : "4-6 haneli bir PIN belirleyin"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-2 block">
                  {mode === "disable" ? "Mevcut PIN" : "PIN"}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value, "pin")}
                    placeholder="••••"
                    maxLength={6}
                    autoComplete="new-password"
                    name="settings-wallet-pin"
                    id="settings-wallet-pin"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono dark:text-white light:text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
                    style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' } as React.CSSProperties}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {(mode === "set" || mode === "change") && (
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-2 block">
                    PIN'i Tekrarla
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPin}
                    onChange={(e) => handlePinChange(e.target.value, "confirm")}
                    placeholder="••••"
                    maxLength={6}
                    autoComplete="new-password"
                    name="settings-wallet-pin-confirm"
                    id="settings-wallet-pin-confirm"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono dark:text-white light:text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500"
                    style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' } as React.CSSProperties}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin("");
                  setConfirmPin("");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSetPin}
                disabled={isLoading || pin.length < 4}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "..." : mode === "disable" ? "Kaldır" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

