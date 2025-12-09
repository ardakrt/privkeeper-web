"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Trash2, QrCode, X } from "lucide-react";
import { generateTOTP, getRemainingSeconds } from "@/lib/totp";
import { copyToClipboard } from "@/lib/clipboard";
import { getServiceInfo } from "@/lib/serviceIcons";
import ServiceLogo from "@/components/finance/ServiceLogo";
import { getOTPQRCode } from "@/app/actions";
import { toast } from "react-hot-toast";

interface TOTPCodeDisplayProps {
  id: string; // OTP record ID for QR generation
  secret: string;
  serviceName: string;
  accountName?: string | null;
  issuer?: string | null;
  algorithm?: string;
  digits?: number;
  period?: number;
  iconUrl?: string | null;
  color?: string | null;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export default function TOTPCodeDisplay({
  id,
  secret,
  serviceName,
  accountName,
  issuer,
  algorithm = "SHA1",
  digits = 6,
  period = 30,
  iconUrl,
  color,
  onDelete,
  isDeleting = false,
}: TOTPCodeDisplayProps) {
  const [code, setCode] = useState<string>("");
  const [remaining, setRemaining] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // QR Modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Generate code and update countdown
  useEffect(() => {
    const updateCode = () => {
      try {
        const newCode = generateTOTP(secret, {
          algorithm: algorithm as "SHA1" | "SHA256" | "SHA512",
          digits,
          period,
        });
        setCode(newCode);
      } catch (error) {
        console.error("Failed to generate TOTP:", error);
        setCode("ERROR");
      }
    };

    const updateCountdown = () => {
      const remaining = getRemainingSeconds(period);

      // Detect reset (when we go from 1 back to period)
      if (remaining === period && !isResetting) {
        setIsResetting(true);
        updateCode();
        setTimeout(() => setIsResetting(false), 100);
      }

      setRemaining(remaining);
    };

    // Initial generation
    updateCode();
    updateCountdown();

    // Update every second
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [secret, algorithm, digits, period]);

  const handleCopy = () => {
    copyToClipboard(code, "2FA kodu kopyalandı!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // QR Code handler
  const handleShowQR = async () => {
    setShowQRModal(true);
    setQrLoading(true);
    
    try {
      const qrDataUrl = await getOTPQRCode(id);
      setQrImage(qrDataUrl);
    } catch (error) {
      console.error("QR generation failed:", error);
      toast.error("QR kod oluşturulamadı");
      setShowQRModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCloseQR = () => {
    setShowQRModal(false);
    // Security: Clear QR image from memory when modal closes
    setQrImage(null);
  };

  const displayName = issuer || serviceName;
  const displayAccount = accountName || "";

  // Get brand info using the new system
  // Note: getServiceInfo returns BrandInfo | null
  const brandInfo = getServiceInfo(displayName);

  // Progress percentage for countdown
  const progressPercentage = (remaining / period) * 100;

  // Calculate circular progress (SVG strokeDashoffset)
  const circumference = 2 * Math.PI * 24; // radius = 24
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  // Get progress color based on remaining time
  const getProgressColor = () => {
    if (remaining <= 5) return '#ef4444'; // red-500
    if (remaining <= 10) return '#f97316'; // orange-500
    return '#10b981'; // emerald-500
  };

  return (
    <div className="group relative">
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.05] hover:border-zinc-300 dark:hover:border-white/[0.1] hover:bg-zinc-50 dark:hover:bg-white/[0.05] rounded-xl p-3 relative transition-all overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between">
          {/* Left: Service Info */}
          <div className="flex items-center gap-4">
            {/* Icon with circular progress */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-200 dark:text-white/5" />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  fill="none"
                  stroke={getProgressColor()}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all"
                  style={{
                    transitionDuration: isResetting ? '200ms' : '1000ms',
                    transitionTimingFunction: isResetting ? 'ease-out' : 'linear',
                    transitionProperty: 'stroke-dashoffset, stroke',
                  }}
                />
              </svg>
              <div className="relative z-10 w-10 h-10 flex items-center justify-center rounded-full overflow-hidden">
                 <ServiceLogo brand={brandInfo} fallbackText={displayName} size="md" className="w-10 h-10 !rounded-full !text-xs" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{displayName}</h3>
              {displayAccount && <p className="text-sm text-zinc-600 dark:text-zinc-400">{displayAccount}</p>}
            </div>
          </div>

          {/* Right: Code and Countdown */}
          <div className="flex items-center gap-4 relative pl-4">
            <div className="text-right transition-all duration-300 ease-out group-hover:translate-x-[-130px]">
              <div className="text-2xl font-mono font-bold text-zinc-900 dark:text-white tracking-wider">
                {code.slice(0, 3)} {code.slice(3)}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-500">{remaining}s</div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 pl-6">
              <button onClick={handleShowQR} className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-all backdrop-blur-sm" title="QR Kod Göster">
                <QrCode className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <button onClick={handleCopy} className="p-2 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 transition-all backdrop-blur-sm" title="Kopyala">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />}
              </button>
              {onDelete && (
                <button onClick={onDelete} disabled={isDeleting} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 border border-red-200 dark:border-red-500/10 transition-colors backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Sil">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div 
        className="block md:hidden relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-4 active:scale-[0.98] transition-transform duration-200 shadow-lg shadow-zinc-200/50 dark:shadow-black/40"
        onClick={handleCopy}
      >
        {/* Glow Effect based on time */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 bg-emerald-500/10 blur-3xl pointer-events-none transition-colors duration-500 opacity-50 dark:opacity-100"
          style={{ backgroundColor: remaining <= 5 ? 'rgba(239, 68, 68, 0.15)' : remaining <= 10 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}
        />

        <div className="p-5 pb-2 relative z-10">
          {/* Header: Info & Actions */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1.5 border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                 <ServiceLogo brand={brandInfo} fallbackText={displayName} size="md" className="w-full h-full !rounded-lg !text-[10px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</h3>
                <p className="text-xs font-medium text-zinc-500 truncate max-w-[160px]">
                  {displayAccount || "Hesap Adı Yok"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 pl-2">
               {/* Countdown Ring */}
               <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-200 dark:text-white/5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke={getProgressColor()}
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 14}
                    strokeDashoffset={(2 * Math.PI * 14) - (progressPercentage / 100) * (2 * Math.PI * 14)}
                    strokeLinecap="round"
                    className="transition-all"
                    style={{
                      transitionDuration: isResetting ? '200ms' : '1000ms',
                      transitionTimingFunction: isResetting ? 'ease-out' : 'linear',
                      transitionProperty: 'stroke-dashoffset, stroke',
                    }}
                  />
                </svg>
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{remaining}</span>
              </div>
            </div>
          </div>

          {/* CODE - The Hero */}
          <div className="py-6 flex flex-col items-center justify-center">
            <div 
              className="text-4xl font-mono font-bold tracking-[0.2em] text-center tabular-nums drop-shadow-sm dark:drop-shadow-2xl transition-colors duration-300"
              style={{ color: remaining <= 5 ? '#f87171' : remaining <= 10 ? '#fdba74' : undefined }}
            >
              <span className={remaining > 10 ? "text-zinc-900 dark:text-white" : ""}>
                {code.slice(0, 3)} {code.slice(3)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 font-medium uppercase tracking-widest">
              {copied ? <span className="text-emerald-500 flex items-center gap-1"><Check size={10} /> Kopyalandı</span> : "Kopyalamak için dokun"}
            </p>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
           <div className="flex gap-4">
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  disabled={isDeleting}
                  className="p-2 -ml-2 text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-90 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
           </div>
           
           <button 
              onClick={(e) => { e.stopPropagation(); handleShowQR(); }}
              className="p-2 -mr-2 text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-90"
           >
              <QrCode size={16} />
           </button>
        </div>

        {/* Progress Bar Bottom */}
        <div className="h-1 w-full bg-zinc-100 dark:bg-black/40">
          <div 
            className="h-full transition-all duration-1000 ease-linear"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: getProgressColor()
            }}
          />
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCloseQR}
        >
          <div 
            className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseQR}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {displayName}
              </h3>
              {displayAccount && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {displayAccount}
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="flex items-center justify-center p-4 bg-white rounded-xl border border-zinc-200 dark:border-transparent">
              {qrLoading ? (
                <div className="w-[268px] h-[268px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : qrImage ? (
                <img 
                  src={qrImage} 
                  alt="OTP QR Code" 
                  className="w-[268px] h-[268px]"
                  draggable={false}
                />
              ) : null}
            </div>

            {/* Warning */}
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-4">
              ⚠️ Bu QR kodu sadece güvendiğiniz cihazlarda tarayın
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
