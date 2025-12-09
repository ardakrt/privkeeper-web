import IbanItem from "@/components/IbanItem";

type Iban = {
  uuid?: string;
  label?: string | null;
  iban?: string | null;
};

export default function IbanList({ ibans, onRefresh }: { ibans: Iban[] | null; onRefresh?: () => void }) {
  if (!ibans || ibans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-zinc-300 dark:text-white/20 mb-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-zinc-900 dark:text-white font-semibold text-lg">Henüz bir IBAN kaydetmemişsiniz</h3>
          <p className="text-zinc-500 dark:text-white/60 text-sm mt-2">Yeni IBAN Ekle butonuna tıklayarak başlayın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ibans.map((iban, idx) => (
        <IbanItem key={(iban.uuid ?? (iban as any).id ?? idx).toString()} iban={iban as any} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
