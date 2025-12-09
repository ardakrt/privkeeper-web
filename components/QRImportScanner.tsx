"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Camera, Upload, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { parseOTPAuthURI } from "@/lib/totp";
import { parseGoogleAuthMigration } from "@/lib/googleAuthMigration";
import { createOTPCode } from "@/app/actions";
import jsQR from "jsqr";

interface ParsedOTPCode {
  serviceName: string;
  accountName?: string;
  secret: string;
  issuer?: string;
  algorithm?: string;
  digits?: number;
  period?: number;
}

export default function QRImportScanner({ onSuccess }: { onSuccess?: () => void }) {
  const [method, setMethod] = useState<"camera" | "upload" | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [parsedCodes, setParsedCodes] = useState<ParsedOTPCode[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          // Start scanning for QR codes more frequently
          scanIntervalRef.current = setInterval(() => {
            scanQRCode();
          }, 300); // Scan every 300ms for faster detection
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Kameraya erişilemiyor. Lütfen tarayıcı izinlerini kontrol edin.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  // Stop camera when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try to detect QR code with inversionAttempts for better detection
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code && code.data) {
      console.log("QR Code detected:", code.data);
      handleQRCodeData(code.data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (event) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            setError("QR kod işlenemedi");
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          console.log("Scanning uploaded image...", canvas.width, "x", canvas.height);

          // Try to detect QR code with all inversion attempts
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            console.log("QR Code found in image:", code.data);
            handleQRCodeData(code.data);
          } else {
            console.log("No QR code found in image");
            setError("QR kod bulunamadı. Lütfen net bir QR kod görseli yükleyin.");
          }
        };

        img.onerror = () => {
          setError("Görsel yüklenemedi");
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = () => {
        setError("Dosya okunamadı");
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File upload error:", err);
      setError("Dosya yüklenirken hata oluştu");
    }
  };

  const handleQRCodeData = (data: string) => {
    try {
      console.log("QR Code Data:", data); // Debug log

      // Check if it's a Google Authenticator export QR
      if (data.startsWith("otpauth-migration://")) {
        console.log("Detected Google Authenticator migration format");

        const parsed = parseGoogleAuthMigration(data);

        if (!parsed || parsed.length === 0) {
          setError("Google Authenticator QR kodu okunamadı. Lütfen tekrar deneyin.");
          return;
        }

        console.log(`Found ${parsed.length} code(s) in migration QR`);

        // Convert to our format and filter duplicates
        const newCodes: ParsedOTPCode[] = [];

        for (const code of parsed) {
          // Check if already added
          const isDuplicate = parsedCodes.some((existing) => existing.secret === code.secret);

          if (!isDuplicate) {
            newCodes.push({
              serviceName: code.serviceName,
              accountName: code.accountName,
              secret: code.secret,
              issuer: code.issuer,
              algorithm: code.algorithm,
              digits: code.digits,
              period: 30, // Default period for TOTP
            });
          }
        }

        if (newCodes.length === 0) {
          setError("Tüm kodlar zaten eklenmiş");
          return;
        }

        setParsedCodes((prev) => [...prev, ...newCodes]);
        setError(null);
        setSuccessMessage(`✅ ${newCodes.length} kod eklendi! Daha fazla QR taratabilir veya bitirmek için aşağıdaki butona basabilirsiniz.`);
        // Don't stop camera - allow more scans
        setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
        return;
      }

      // Parse standard otpauth:// URI
      if (data.startsWith("otpauth://totp/") || data.startsWith("otpauth://hotp/")) {
        console.log("Parsing OTP Auth URI..."); // Debug log
        const parsed = parseOTPAuthURI(data);

        console.log("Parsed result:", parsed); // Debug log

        if (!parsed) {
          setError(`QR kod formatı geçersiz. URI: ${data.substring(0, 50)}...`);
          return;
        }

        if (!parsed.secret) {
          setError("Secret key bulunamadı. Lütfen QR kodu tekrar taratın.");
          return;
        }

        // Check if already added
        const isDuplicate = parsedCodes.some(
          (code) => code.secret === parsed.secret
        );

        if (isDuplicate) {
          setError("Bu kod zaten eklendi");
          return;
        }

        const newCode: ParsedOTPCode = {
          serviceName: parsed.issuer || parsed.account.split("@")[0] || "Unknown",
          accountName: parsed.account,
          secret: parsed.secret,
          issuer: parsed.issuer,
          algorithm: parsed.algorithm,
          digits: parsed.digits,
          period: parsed.period,
        };

        console.log("Adding new code:", newCode); // Debug log

        setParsedCodes((prev) => [...prev, newCode]);
        setError(null);
        setSuccessMessage(`✅ ${newCode.serviceName} eklendi!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Don't stop camera - allow multiple scans
      } else {
        setError(`Geçersiz QR kod formatı. Tarandı: ${data.substring(0, 50)}...`);
      }
    } catch (err) {
      console.error("QR parse error:", err);
      setError(`QR kod okunamadı: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`);
    }
  };

  const handleImportAll = async () => {
    if (parsedCodes.length === 0) return;

    setIsImporting(true);
    setError(null);
    let successCount = 0;

    for (const code of parsedCodes) {
      try {
        const formData = new FormData();
        formData.append("service_name", code.serviceName);
        if (code.accountName) formData.append("account_name", code.accountName);
        formData.append("secret", code.secret);
        if (code.issuer) formData.append("issuer", code.issuer);
        formData.append("algorithm", code.algorithm || "SHA1");
        formData.append("digits", String(code.digits || 6));
        formData.append("period", String(code.period || 30));

        await createOTPCode(formData);
        successCount++;
        setImportedCount(successCount);
      } catch (err) {
        console.error(`Failed to import ${code.serviceName}:`, err);
      }
    }

    setIsImporting(false);

    if (successCount === parsedCodes.length) {
      setParsedCodes([]);
      onSuccess?.();
    } else {
      setError(`${successCount}/${parsedCodes.length} kod başarıyla içe aktarıldı`);
    }
  };

  const removeCode = (index: number) => {
    setParsedCodes((prev) => prev.filter((_, i) => i !== index));
  };

  if (parsedCodes.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="rounded-2xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-white/5 dark:bg-white/5 light:bg-white p-4 md:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-green-500/20 text-green-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white dark:text-white light:text-zinc-900">
                  {parsedCodes.length} Kod Bulundu
                </h2>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                  Toplu içe aktarma hazır
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                💡 Tüm hesaplarınız tek seferde eklenecek - çok daha hızlı!
              </p>
            </div>
          </div>

          {/* Parsed Codes List */}
          <div className="space-y-3 mb-6">
            {parsedCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200"
              >
                <div className="min-w-0 mr-4">
                  <p className="font-medium text-white dark:text-white light:text-zinc-900 truncate">
                    {code.issuer || code.serviceName}
                  </p>
                  {code.accountName && (
                    <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600 truncate">
                      {code.accountName}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeCode(index)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-500">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => setParsedCodes([])}
              disabled={isImporting}
              className="flex-1 bg-white/5 dark:bg-white/5 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 px-6 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={handleImportAll}
              disabled={isImporting}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  İçe Aktarılıyor ({importedCount}/{parsedCodes.length})
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Tümünü İçe Aktar
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="rounded-2xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-white/5 dark:bg-white/5 light:bg-white p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-500">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white dark:text-white light:text-zinc-900">
              QR Kod ile İçe Aktar
            </h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
              Birden fazla 2FA kodunu tek seferde ekleyin
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

        {!method ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setMethod("camera");
                startCamera();
              }}
              className="p-6 md:p-8 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-100 hover:border-emerald-500/50 transition-all group"
            >
              <Camera className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-900 mb-2">
                Kamera ile Tara
              </h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                QR kodu doğrudan taratın
              </p>
            </button>

            <button
              onClick={() => setMethod("upload")}
              className="p-6 md:p-8 rounded-xl bg-white/5 dark:bg-white/5 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-100 hover:border-cyan-500/50 transition-all group"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-cyan-500" />
              <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-900 mb-2">
                Görsel Yükle
              </h3>
              <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                QR kod görseli seçin
              </p>
            </button>
          </div>
        ) : method === "camera" ? (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col md:relative md:bg-transparent md:z-auto md:block">
            {/* Mobile Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center md:hidden bg-gradient-to-b from-black/80 to-transparent">
               <h3 className="text-white font-semibold text-lg">QR Tara</h3>
               <button 
                 onClick={() => { stopCamera(); setMethod(null); }} 
                 className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md active:scale-95 transition-transform"
               >
                 <X className="w-6 h-6" />
               </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative flex-1 md:flex-none md:rounded-xl md:overflow-hidden md:bg-black md:mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover md:h-auto md:max-h-[400px]"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/50 animate-pulse" />
              </div>
            </div>

            {/* Controls & Messages */}
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col gap-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent md:static md:bg-none md:p-0">
                {/* Success/Error Messages */}
                {(successMessage || error || parsedCodes.length > 0) && (
                  <div className="space-y-2">
                    {successMessage && (
                      <div className="p-3 rounded-xl bg-green-500/90 text-white border border-green-500/20 backdrop-blur-md shadow-lg">
                        <p className="text-sm font-medium text-center">✅ {successMessage}</p>
                      </div>
                    )}
                    
                    {error && (
                       <div className="p-3 rounded-xl bg-red-500/90 text-white border border-red-500/20 backdrop-blur-md shadow-lg">
                        <p className="text-sm font-medium text-center">{error}</p>
                      </div>
                    )}

                    {parsedCodes.length > 0 && !successMessage && (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
                        <p className="text-sm font-semibold text-emerald-400 text-center">
                          {parsedCodes.length} kod tarandı
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Helper Text */}
                <div className="md:mb-4 space-y-2 hidden md:block">
                  <p className="text-center text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                    QR kodu kamera görüntüsünün ortasına getirin
                  </p>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 text-center">
                      ⚠️ Parlak ekranda QR okutamıyorsanız: Ekran görüntüsü alıp &quot;Görsel Yükle&quot; ile deneyin
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-3 pb-safe">
                  <button
                    onClick={() => {
                      stopCamera();
                      setMethod(null);
                    }}
                    className="hidden md:block flex-1 bg-white/5 dark:bg-white/5 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    İptal
                  </button>

                  {parsedCodes.length > 0 && (
                    <button
                      onClick={() => {
                        stopCamera();
                        // Keep parsedCodes
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg active:scale-95"
                    >
                      Taramayı Bitir ({parsedCodes.length})
                    </button>
                  )}
                </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block w-full p-8 md:p-12 rounded-xl border-2 border-dashed border-white/20 dark:border-white/20 light:border-zinc-300 hover:border-cyan-500/50 transition-colors cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-400 group-hover:text-cyan-500 transition-colors" />
                <p className="text-base font-medium text-white dark:text-white light:text-zinc-900 mb-2">
                  QR kod görseli seçin
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
                  PNG, JPG veya JPEG formatında
                </p>
              </div>
            </label>

            <button
              onClick={() => setMethod(null)}
              className="w-full mt-4 bg-white/5 dark:bg-white/5 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Geri
            </button>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <p className="text-sm font-semibold text-emerald-400 mb-2">
              ✨ Toplu İçe Aktarma Özelliği
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600">
              <strong>Google Authenticator:</strong> Üç nokta (⋮) → &quot;Transfer accounts&quot; → &quot;Export accounts&quot; → Tüm hesapları seç → QR oluştur
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm font-semibold text-blue-400 mb-2">
              📱 Desteklenen Formatlar
            </p>
            <ul className="text-xs text-zinc-400 dark:text-zinc-400 light:text-zinc-600 space-y-1">
              <li>• Google Authenticator export QR (toplu)</li>
              <li>• Standart TOTP QR kodları (tekil)</li>
              <li>• QR kod görselleri (PNG, JPG)</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
