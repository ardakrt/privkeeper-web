import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuthenticatorPageManager from "@/components/AuthenticatorPageManager";

export default async function AuthenticatorPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch OTP codes
  const { data: otpCodes, error: otpError } = await supabase
    .from("otp_codes")
    .select("*")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (otpError) {
    console.error("Error fetching OTP codes:", otpError);
  }

  return (
    <div className="w-full h-full">
      <AuthenticatorPageManager otpCodes={otpCodes || []} />
    </div>
  );
}
