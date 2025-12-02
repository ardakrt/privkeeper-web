"use client";

import { useState, useTransition } from "react";
import { deleteIban, updateIban } from "@/app/actions";
import { toast } from "react-hot-toast";
import { copyFormattedIBAN, formatIBAN } from "@/lib/clipboard";
import IBANQRModal from "@/components/IBANQRModal";
import { getBankInfo } from "@/lib/serviceIcons";
import ServiceLogo from "@/components/finance/ServiceLogo";

type Iban = {
  uuid?: string;
  label?: string | null;
  iban?: string | null;
};

export default function IbanItem({ iban, onRefresh }: { iban: Iban; onRefresh?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const handleCopy = async () => {
    if (iban.iban) {
      await copyFormattedIBAN(iban.iban);
    }
  };

  const handleShare = async () => {
    const title = `Keeper - ${iban.label ?? "IBAN"}`;
    const text = `IBAN: ${iban.iban ?? ""}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title, text });
      } catch {
        // kullanıcı iptal edebilir; sessizce yoksay
      }
    } else {
      toast.error("Paylaşma özelliği bu tarayıcıda desteklenmiyor. Kopyalamayı deneyin.");
    }
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (iban.uuid) formData.append("uuid", iban.uuid);
        const numericId = (iban as any).id;
        if (numericId) formData.append("id", String(numericId));
        if (!formData.has("uuid") && !formData.has("id")) {
          throw new Error("IBAN kimliği bulunamadı");
        }
        await deleteIban(formData);
        toast.success("IBAN silindi!");
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error("IBAN silme hatası:", error);
        toast.error("IBAN silinemedi.");
      }
    });
  };

  return (
    <li className="group relative">
      {isEditing ? (
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateIban(formData as FormData);
              setIsEditing(false);
              if (onRefresh) {
                onRefresh();
              }
            });
          }}
          className="bg-zinc-900/40 dark:bg-zinc-900/40 light:bg-white p-6 rounded-xl border border-white/5 dark:border-white/5 light:border-zinc-200 space-y-4 light:shadow-sm"
        >
          <input type="hidden" name="uuid" defaultValue={(iban.uuid ?? "") as string} />
          <input type="hidden" name="id" defaultValue={((iban as any).id ?? "") as string} />

          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500">Etiket / Banka Adı</label>
            <input
              name="label"
              type="text"
              defaultValue={iban.label ?? ""}
              className="bg-black/30 dark:bg-black/30 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 rounded-lg px-4 py-2 text-white dark:text-white light:text-zinc-900 outline-none"
              placeholder="Etiket"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500">Hesap Sahibi (Ad Soyad)</label>
            <input
              name="holder_name"
              type="text"
              defaultValue={(iban as any).holder_name ?? ""}
              className="bg-black/30 dark:bg-black/30 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 rounded-lg px-4 py-2 text-white dark:text-white light:text-zinc-900 outline-none"
              placeholder="Örn: Ahmet Yılmaz"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-400 dark:text-zinc-400 light:text-zinc-500">IBAN Numarası</label>
            <input
              name="number"
              type="text"
              defaultValue={iban.iban ?? ""}
              className="bg-black/30 dark:bg-black/30 light:bg-zinc-50 border border-white/10 dark:border-white/10 light:border-zinc-200 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 rounded-lg px-4 py-2 text-white dark:text-white light:text-zinc-900 font-mono outline-none uppercase"
              placeholder="IBAN"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-purple-600 rounded-lg text-white dark:text-white light:text-zinc-900 font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-200 rounded-lg text-white dark:text-white light:text-zinc-900 dark:text-white dark:text-white light:text-zinc-900 light:text-zinc-900 font-medium hover:bg-zinc-700 dark:hover:bg-zinc-700 light:hover:bg-zinc-300 transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Action Buttons - Floating Bubble Above Card */}
          <div className="absolute -top-3 right-4 z-50 flex items-center gap-1 bg-white dark:bg-white dark:text-black light:bg-zinc-900 light:text-white rounded-full shadow-xl p-1.5 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out">
            <button
              type="button"
              onClick={() => setIsQRModalOpen(true)}
              className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors active:scale-90"
              title="QR Kod Göster"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors active:scale-90"
              title="Kopyala"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors active:scale-90"
              title="Paylaş"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-zinc-200 rounded-full transition-colors active:scale-90"
              title="Düzenle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors active:scale-90 disabled:opacity-50"
              title="Sil"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Card Content - Glass Design in Dark, Solid in Light */}
          <div className="bg-white/[0.02] dark:bg-white/[0.02] light:bg-white border border-white/[0.05] dark:border-white/[0.05] light:border-zinc-200 hover:border-white/[0.1] dark:hover:border-white/[0.1] light:hover:border-zinc-300 hover:bg-white/[0.05] dark:hover:bg-white/[0.05] light:hover:bg-zinc-50 rounded-xl p-5 relative transition-all overflow-hidden light:shadow-md">
            {/* Subtle gradient overlay for light mode */}
            <div className="absolute inset-0 light:bg-gradient-to-br light:from-purple-50/30 light:to-transparent dark:hidden pointer-events-none"></div>

            {/* Banka İkonu ve Adı */}
            <div className="flex items-start gap-3 mb-4 relative z-10">
              {(() => {
                const bankInfo = getBankInfo(iban.label || "");
                if (bankInfo) {
                  return <ServiceLogo brand={bankInfo} fallbackText={iban.label || "?"} size="md" />;
                }
                return (
                  <div className="p-2.5 bg-purple-600/10 dark:bg-purple-600/10 light:bg-purple-100 rounded-lg flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400 dark:text-purple-400 light:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-white dark:text-white light:text-zinc-900 truncate">{iban.label ?? "(Etiketsiz)"}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-zinc-600 mt-0.5">Banka Hesabı</p>
              </div>
            </div>

            {/* IBAN Numarası */}
            <div className="bg-black/30 dark:bg-black/30 light:bg-purple-50 border border-white/5 dark:border-white/5 light:border-purple-100 rounded-lg p-3.5 relative z-10">
              <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-purple-600 mb-1.5 uppercase tracking-wider font-semibold">IBAN NUMARASI</p>
              <p className="font-mono text-zinc-300 dark:text-zinc-300 light:text-zinc-900 text-sm leading-relaxed break-all">{iban.iban ?? "—"}</p>
            </div>
          </div>

          {/* QR Code Modal */}
          <IBANQRModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            iban={formatIBAN(iban.iban || "")}
            label={iban.label || "IBAN"}
          />
        </>
      )}
    </li>
  );
}
