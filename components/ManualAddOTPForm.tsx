"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Key, AlertCircle, Loader2 } from "lucide-react";
import { createOTPCode } from "@/app/actions";
import { getAllServiceNames, getServiceInfo } from "@/lib/serviceIcons";

export default function ManualAddOTPForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const allServices = getAllServiceNames();
  const filteredServices = serviceName
    ? allServices.filter((s) => s.toLowerCase().includes(serviceName.toLowerCase())).slice(0, 8)
    : [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      await createOTPCode(formData);

      // Reset form and call success callback
      e.currentTarget.reset();
      onSuccess?.();
    } catch (err) {
      console.error("Failed to add OTP code:", err);
      setError(err instanceof Error ? err.message : "2FA kodu eklenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-500">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Manuel 2FA Ekle
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Secret key ile yeni bir 2FA kodu ekleyin
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service Name with Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Servis Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="service_name"
              required
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Örn: Google, GitHub, AWS"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />

            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredServices.length > 0 && (
              <div className="absolute z-10 w-full mt-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-xl overflow-hidden">
                {filteredServices.map((service) => {
                  const info = getServiceInfo(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        setServiceName(service);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors text-left"
                    >
                      <span 
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                        style={{ 
                          backgroundColor: info?.colors?.bg || '#f4f4f5',
                          color: info?.colors?.primary || '#71717a'
                        }}
                      >
                        {service.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {service}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Hesap Adı
            </label>
            <input
              type="text"
              name="account_name"
              placeholder="Örn: kullanici@email.com"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Secret Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="secret"
              required
              placeholder="Base32 encoded secret (Örn: JBSWY3DPEHPK3PXP)"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Boşluklar ve tire işaretleri otomatik olarak kaldırılacaktır
            </p>
          </div>

          {/* Issuer */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Issuer
            </label>
            <input
              type="text"
              name="issuer"
              placeholder="Opsiyonel"
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Advanced Settings */}
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 transition-transform group-open:rotate-90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Gelişmiş Ayarlar
              </span>
            </summary>

            <div className="mt-4 space-y-4 pl-6">
              {/* Algorithm */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Algoritma
                </label>
                <select
                  name="algorithm"
                  defaultValue="SHA1"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="SHA1">SHA1 (Varsayılan)</option>
                  <option value="SHA256">SHA256</option>
                  <option value="SHA512">SHA512</option>
                </select>
              </div>

              {/* Digits */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Kod Uzunluğu
                </label>
                <select
                  name="digits"
                  defaultValue="6"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  <option value="6">6 Hane (Varsayılan)</option>
                  <option value="7">7 Hane</option>
                  <option value="8">8 Hane</option>
                </select>
              </div>

              {/* Period */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Periyot (saniye)
                </label>
                <input
                  type="number"
                  name="period"
                  defaultValue="30"
                  min="15"
                  max="120"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Kategori
                </label>
                <input
                  type="text"
                  name="category"
                  placeholder="Örn: Sosyal Medya, Email, Cloud"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Notlar
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Opsiyonel notlar..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </details>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  2FA Kodu Ekle
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>İpucu:</strong> Secret key genellikle 2FA kurulumu sırasında QR kodun altında
            gösterilir. Base32 formatında olmalıdır (örn: JBSWY3DPEHPK3PXP).
          </p>
        </div>
      </div>
    </motion.div>
  );
}
