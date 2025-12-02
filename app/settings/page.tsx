import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/ThemeToggle";
import AccentColorPicker from "@/components/AccentColorPicker";
import WalletPinSettings from "@/components/WalletPinSettings";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pref } = await supabase
    .from("user_preferences")
    .select("theme_mode_web, accent_color, wallet_pin_enabled, wallet_pin")
    .eq("user_id", user.id)
    .single();
  const accentColor = (pref as any)?.accent_color || "#3b82f6";
  const walletPinEnabled = (pref as any)?.wallet_pin_enabled || false;

  return (
    <div className="min-h-screen p-6 space-y-6 relative dark:bg-zinc-950 light:bg-[#F9FAFB]">
      {/* Crystal Maze background, subtle and accent-tinted */}
      <div
        className="absolute inset-0 -z-10 opacity-60 dark:opacity-40 light:opacity-30"
        style={{
          backgroundImage:
            `radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--accent-color) 12%, transparent) 0%, transparent 60%),` +
            `radial-gradient(60% 60% at 100% 0%, color-mix(in srgb, var(--accent-color) 10%, transparent) 0%, transparent 55%),` +
            `radial-gradient(80% 80% at 50% 100%, color-mix(in srgb, var(--accent-color) 8%, transparent) 0%, transparent 60%)`,
          backgroundColor: "transparent",
        }}
      />
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold dark:text-white light:text-zinc-900">Uygulama Ayarları</h1>
        <Link href="/dashboard" className="dark:text-zinc-400 dark:hover:text-white light:text-zinc-600 light:hover:text-zinc-900 transition-colors">Dashboard&apos;a Geri Dön</Link>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-medium dark:text-white light:text-zinc-900">Tema ve Görünüm</h2>
        <ThemeToggle />
        <AccentColorPicker currentColor={accentColor} />
      </div>

      <div className="space-y-6 max-w-2xl mx-auto mt-8">
        <h2 className="text-lg font-medium dark:text-white light:text-zinc-900">Güvenlik</h2>
        <WalletPinSettings enabled={walletPinEnabled} />
      </div>
    </div>
  );
}
