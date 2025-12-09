import AccountItem from "@/components/AccountItem";

type Account = {
  id?: string | number;
  uuid?: string;
  service_name?: string | null;
  service?: string | null;
  username?: string | null;
  username_enc?: string | null;
  bt_token_id_password?: string | null;
};

export default function AccountList({ accounts, onRefresh }: { accounts: Account[] | null; onRefresh?: () => void }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-zinc-300 dark:text-white/20 mb-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-zinc-900 dark:text-white font-semibold text-lg">Henüz bir hesap kaydetmemişsiniz</h3>
          <p className="text-zinc-500 dark:text-white/60 text-sm mt-2">Yeni Hesap Ekle butonuna tıklayarak başlayın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {accounts.map((acc, idx) => (
        <AccountItem key={(acc.uuid ?? acc.id ?? idx).toString()} account={acc} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
