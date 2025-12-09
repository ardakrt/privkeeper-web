"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, X, Sparkles } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { BillingCycle } from "@/types/finance";
import ServiceLogo from "@/components/finance/ServiceLogo";
import { getBankInfo } from "@/lib/serviceIcons";

interface AddLoanModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editData?: any; // Data to edit (if in edit mode)
  mobileMode?: boolean; // Whether the modal is in mobile mode
}

interface LoanFormData {
  name: string; // Banka adı
  amount: string; // Taksit tutarı
  currency: string;
  billing_cycle: BillingCycle; // Ödeme periyodu
  payment_date: string; // Ödeme günü
  linked_card_details: string; // Bağlı IBAN
  current_installment: string; // Kaçıncı taksit
  total_installments: string; // Toplam taksit sayısı
  start_date: string; // Başlangıç tarihi
  color: string;
  logo_url: string;
}

export default function AddLoanModal({ onClose, onSuccess, editData }: AddLoanModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient();
  const isEditMode = !!editData;

  const [formData, setFormData] = useState<LoanFormData>({
    name: editData?.name || "",
    amount: editData?.amount?.toString() || "",
    currency: editData?.currency || "TRY",
    billing_cycle: editData?.billing_cycle || "monthly",
    payment_date: editData?.payment_date?.toString() || "1",
    linked_card_details: editData?.linked_card_details || "",
    current_installment: editData?.paid_installments?.toString() || "1",
    total_installments: editData?.total_installments?.toString() || "",
    start_date: editData?.start_date
      ? new Date(editData.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    color: editData?.color || "#10b981",
    logo_url: editData?.logo_url || "",
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFile(file);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleFile = async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Analyze with AI
    setIsAnalyzing(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("image", file);

      const response = await fetch("/api/analyze-subscription", {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success && result.data) {
        const aiData = result.data;
        setFormData((prev) => ({
          ...prev,
          name: aiData.name || prev.name,
          amount: aiData.amount?.toString() || prev.amount,
          currency: aiData.currency || prev.currency,
          billing_cycle: aiData.billing_cycle || prev.billing_cycle,
          payment_date: aiData.payment_date?.toString() || prev.payment_date,
          linked_card_details: aiData.linked_card_details || prev.linked_card_details,
          color: aiData.color || prev.color,
          total_installments: aiData.total_installments?.toString() || prev.total_installments,
          current_installment: aiData.paid_installments?.toString() || prev.current_installment,
        }));
      } else {
        alert("AI analizi başarısız oldu. Lütfen manuel olarak doldurun.");
      }
    } catch (error) {
      console.error("AI Analysis Error:", error);
      alert("Görüntü analizi sırasında bir hata oluştu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Oturum bulunamadı. Lütfen giriş yapın.");
        return;
      }

      const loanData = {
        user_id: user.id,
        name: formData.name,
        type: "loan",
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        billing_cycle: formData.billing_cycle,
        payment_date: parseInt(formData.payment_date),
        linked_card_details: formData.linked_card_details || null,
        total_installments: parseInt(formData.total_installments),
        paid_installments: parseInt(formData.current_installment),
        start_date: formData.start_date,
        logo_url: formData.logo_url || null,
        color: formData.color || null,
        status: "active",
      };

      let error;
      if (isEditMode) {
        // Update existing loan
        ({ error } = await supabase
          .from("subscriptions")
          .update(loanData)
          .eq("id", editData.id));
      } else {
        // Insert new loan
        ({ error } = await supabase.from("subscriptions").insert(loanData));
      }

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      console.log(isEditMode ? "Loan updated successfully!" : "Loan saved successfully!");

      onSuccess(); // This will reload data and close the modal
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("Kaydetme sırasında bir hata oluştu: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Detect bank info
  const detectedBank = getBankInfo(formData.name);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
      {/* LEFT COLUMN: AI Image Upload Zone */}
      <div className="md:col-span-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative aspect-[3/4] border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            dragActive
              ? "border-purple-500 bg-purple-500/10"
              : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 bg-zinc-50 dark:bg-zinc-900/30"
          }`}
        >
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center p-8">
              <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-6" />
              <p className="text-zinc-900 dark:text-white font-semibold text-lg">Yapay Zeka Analiz Ediyor...</p>
              <p className="text-zinc-500 text-sm mt-2">Lütfen bekleyin</p>
            </div>
          ) : uploadedImage ? (
            <div className="relative w-full h-full p-6 flex flex-col">
              {/* Image Preview */}
              <div className="flex-1 relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded preview"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Success Message */}
              <div className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-white/10 rounded-xl p-4">
                <p className="text-zinc-900 dark:text-white font-medium flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Görüntü Analiz Edildi
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Form otomatik dolduruldu. Kontrol edin ve kaydedin.
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedImage(null);
                }}
                className="absolute top-8 right-8 bg-white/90 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:text-red-500 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-2xl mb-6">
                <Upload className="w-16 h-16 text-zinc-400 dark:text-zinc-600" />
              </div>
              <h3 className="text-zinc-900 dark:text-white font-semibold text-xl mb-2">
                Yapay Zeka ile Otomatik Doldur
              </h3>
              <p className="text-zinc-500 text-sm max-w-xs mb-4">
                Kredi sözleşmesi veya ödeme ekran görüntüsünü buraya sürükleyin veya tıklayarak seçin
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-600">
                <kbd className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 rounded">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 rounded">V</kbd>
                <span>ile yapıştırabilirsiniz</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Form Fields */}
      <div className="md:col-span-3">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Bank Name - Full Width */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Banka / Kurum Adı
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Garanti BBVA, Akbank, İş Bankası..."
                  className="flex-1 h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                />
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <ServiceLogo brand={detectedBank} fallbackText={formData.name || "?"} size="md" className="h-10 w-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Kaçıncı Taksit + Toplam Taksit */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Kaçıncı Taksit
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.current_installment}
                onChange={(e) => setFormData({ ...formData, current_installment: e.target.value })}
                placeholder="1"
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
            <div className="col-span-6">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Toplam Taksit
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.total_installments}
                onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
                placeholder="12"
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Row 3: Taksit Tutarı + Para Birimi */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Taksit Tutarı
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="1500.00"
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Para Birimi
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          {/* Row 4: Başlangıç Tarihi + Ödeme Periyodu + Ödeme Günü */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Ödeme Periyodu
              </label>
              <select
                value={formData.billing_cycle}
                onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as BillingCycle })}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              >
                <option value="monthly">Aylık</option>
                <option value="yearly">Yıllık</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Ödeme Günü
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                placeholder="15"
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Row 5: IBAN - Full Width */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Bağlı IBAN <span className="text-zinc-600">(Opsiyonel)</span>
              </label>
              <input
                type="text"
                value={formData.linked_card_details}
                onChange={(e) => setFormData({ ...formData, linked_card_details: e.target.value })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Row 6: Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-10 bg-transparent text-zinc-500 dark:text-zinc-400 rounded-xl text-sm font-medium hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200 dark:hover:border-white/10 transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 h-10 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Kaydet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
