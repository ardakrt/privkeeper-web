"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function verifyPin(pin: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "Oturum bulunamadı" };
  }

  try {
    // Kullanıcının PIN hash'ini al
    const { data: pref, error: prefError } = await supabase
      .from("user_preferences")
      .select("pin")
      .eq("user_id", user.id)
      .single();

    if (prefError || !pref || !pref.pin) {
      // Eğer PIN ayarlanmamışsa, bu adımı geçmek isteyebiliriz veya hata verebiliriz.
      // Ancak 'auth flow' gereği PIN olmalı.
      return { success: false, message: "PIN ayarlanmamış" };
    }

    // PIN kontrolü
    const isValid = await bcrypt.compare(pin, pref.pin);

    if (isValid) {
      return { success: true };
    } else {
      return { success: false, message: "Hatalı PIN" };
    }
  } catch (error) {
    console.error("PIN doğrulama hatası:", error);
    return { success: false, message: "Bir hata oluştu" };
  }
}

export async function sendPinResetEmail(email: string) {
  const supabase = await createSupabaseServerClient();
  
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (!siteUrl && process.env.NEXT_PUBLIC_VERCEL_URL) {
    siteUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  if (!siteUrl) {
    siteUrl = "http://localhost:3000";
  }

  siteUrl = siteUrl.trim();
  if (!siteUrl.startsWith("http")) {
    siteUrl = `https://${siteUrl}`;
  }
  if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);

  console.log("PIN Reset Redirect URL:", `${siteUrl}/auth/callback?next=/auth/update-pin`);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-pin`,
  });

  if (error) {
    console.error("PIN sıfırlama e-postası hatası:", error);
    return { success: false, message: error.message };
  }

  return { success: true, message: "Sıfırlama bağlantısı gönderildi" };
}

export async function checkPinExists() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { exists: false };
  }

  try {
    const { data: pref } = await supabase
      .from("user_preferences")
      .select("pin")
      .eq("user_id", user.id)
      .single();

    return { exists: !!(pref && pref.pin) };
  } catch (error) {
    console.error("PIN kontrol hatası:", error);
    return { exists: false };
  }
}
