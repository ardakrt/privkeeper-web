"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import getBasisTheory from "@/lib/basisTheory";
import { getBinInfo, getCardBrandFromBin, detectBrandFromCardNumber } from "@/lib/binLookup";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";

export type UserAuthInfo = {
  exists: boolean;
  userId: string | null;
  avatarUrl: string | null;
  userName: string | null;
  theme: "light" | "dark" | null;
};

export type DeviceTrustResult = {
  exists: boolean;
  trusted: boolean;
};

// Reset Password (Send Email)
export async function resetPassword(formData: FormData) {
  // Rate Limit Check
  try {
    const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
    await checkRateLimit(ip);
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const email = formData.get("email") as string;
  const supabase = await createSupabaseServerClient();
  
  // Supabase'in kendi reset password akışını kullanıyoruz
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
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    console.error("Reset password error:", error);
    // Güvenlik için detaylı hata vermeyebiliriz ama şimdilik kullanıcıya dönelim
    return { success: false, message: error.message };
  }

  return { success: true };
}

// Sign up (name + email + password)
export async function signUpUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") ?? "").toString();
  const email = (formData.get("email") ?? "").toString();
  const password = (formData.get("password") ?? "").toString();
  const avatarFile = formData.get("avatar") as File | null;

  if (!password || password.length < 6) {
    throw new Error("Şifre en az 6 karakter olmalı");
  }

  // Avatar güvenlik kontrolleri
  if (avatarFile && avatarFile.size > 0) {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) {
      throw new Error("Avatar sadece PNG/JPEG/WebP olabilir");
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (avatarFile.size > maxSize) {
      throw new Error("Avatar boyutu 5MB'dan küçük olmalı");
    }
  }

  try {
    // 1. Kullanıcıyı kaydet
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name: name,
        },
      },
    });

    if (authError) {
      throw authError;
    }

    if (authData.user) {
      const userId = authData.user.id;

      // 2. User Preferences (PIN hash olmadan)
      const { error: prefError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
          theme_mode_web: "dark",
          theme_mode_mobile: "dark",
        });

      if (prefError) {
        console.error("Tercih oluşturma hatası:", prefError);
      }

      // 3. Avatar yükleme (varsa)
      if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile);

        if (uploadError) {
          console.error("Avatar yükleme hatası:", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

          const avatarUrl = publicUrlData.publicUrl;

          const { error: updateError } = await supabase.auth.updateUser({
            data: { avatar_url: avatarUrl },
          });

          if (updateError) {
            console.error("Avatar metadata güncelleme hatası:", updateError);
          }
        }
      }
    }
  } catch (error) {
    console.error("Kayıt hatası:", error);
    throw error;
  }

  redirect("/dashboard");
}

// Send OTP using Supabase Native Auth
export async function sendVerificationCode(email: string, isRegistration: boolean = false) {
  // Rate Limit Check
  try {
    const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
    await checkRateLimit(ip);
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const supabase = await createSupabaseServerClient();
  
  console.log(`[Supabase Auth] Sending OTP to ${email} (Registration: ${isRegistration})`);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: isRegistration,
    },
  });

  if (error) {
    console.error("Supabase OTP Error:", error);
    if (error.message.includes("Signups not allowed")) {
      return { success: false, message: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." };
    }
    if (error.status === 429) {
      return { success: false, message: "Çok fazla istek gönderdiniz. Lütfen 1 dakika bekleyin." };
    }
    return { success: false, message: "Kod gönderilemedi: " + error.message };
  }

  return { success: true };
}

// Verify OTP using Supabase Native Auth (Device Verification)
export async function verifyDeviceCode(email: string, code: string, _deviceId: string) {
  const supabase = await createSupabaseServerClient();
  
  let verifyResult = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (verifyResult.error) {
    console.log("Email OTP failed, trying 'signup' type...");
    verifyResult = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
  }

  const { data, error } = verifyResult;

  if (error) {
    console.error("Verification Error:", error);
    return { success: false, message: "Geçersiz veya süresi dolmuş kod" };
  }

  if (!data.session) {
    return { success: false, message: "Doğrulama başarısız oldu (oturum oluşmadı)" };
  }

  const deviceToken = crypto.randomUUID();
  const userAgent = "Web Client";

  const { error: deviceError } = await supabase
    .from("trusted_devices")
    .insert({
      user_id: data.user?.id,
      device_token: deviceToken,
      user_agent: userAgent
    });

  if (deviceError) {
    console.error("Device trust error details:", JSON.stringify(deviceError, null, 2));
    return { success: false, message: "Cihaz güvene alınamadı: " + (deviceError.message || "Bilinmeyen veritabanı hatası") };
  }

  const cookieStore = await cookies();
  
  cookieStore.set("device_verified", deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3 * 24 * 60 * 60,
  });

  return { success: true, userId: data.user?.id };
}

import { preloadUserData } from "@/app/actions/preload";

// Verify OTP and Complete Registration
export async function verifyAndCompleteRegistration(
  email: string, 
  code: string, 
  name: string, 
  password: string,
  avatarFile?: File | null
) {
  const supabase = await createSupabaseServerClient();
  
  let verifyResult = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (verifyResult.error) {
    console.log("Email OTP failed, trying 'signup' type...");
    verifyResult = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
  }

  const { data, error } = verifyResult;

  if (error) {
    console.error("Verification Error:", error);
    return { success: false, message: "Geçersiz veya süresi dolmuş kod" };
  }

  if (!data.session || !data.user) {
    return { success: false, message: "Doğrulama başarısız oldu" };
  }

  const userId = data.user.id;

  // Preload data immediately
  preloadUserData(userId);

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password, 
      data: {
        full_name: name,
        name: name,
      }
    });

    if (updateError) throw updateError;

    const { error: prefError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        theme_mode_web: "dark",
        theme_mode_mobile: "dark",
      }, { onConflict: "user_id" });

    if (prefError) console.error("Tercih oluşturma hatası:", prefError);

    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
          
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrlData.publicUrl }
        });
      }
    }

    const deviceToken = crypto.randomUUID();
    await supabase.from("trusted_devices").insert({
      user_id: userId,
      device_token: deviceToken,
      user_agent: "Web Client"
    });

    const cookieStore = await cookies();
    cookieStore.set("device_verified", deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3 * 24 * 60 * 60,
    });

    return { success: true, redirect: "/dashboard" };

  } catch (err: any) {
    console.error("Registration completion error:", err);
    return { success: false, message: "Kayıt tamamlanamadı: " + (err.message || "Bilinmeyen hata") };
  }
}

export async function checkDeviceVerification() {
  const cookieStore = await cookies();
  return cookieStore.has("device_verified");
}

// Create Note
export async function createNote(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const title = (formData.get("title") ?? "").toString();
  const content = (formData.get("content") ?? "").toString();

  await supabase.from("notes").insert({ title, content, user_id: user.id });

  revalidatePath("/dashboard");
}

// Update Note
export async function updateNote(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  const title = (formData.get("title") ?? "").toString();
  const content = (formData.get("content") ?? "").toString();

  if (!id) throw new Error("Güncellenecek not ID'si eksik");

  const { error } = await supabase
    .from("notes")
    .update({ title, content, updated_at: new Date().toISOString() })
    .match({ id, user_id: user.id });

  if (error) {
    console.error("Not güncelleme hatası:", error);
    throw new Error("Not güncellenemedi: " + error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notes");
}

// Delete Note
export async function deleteNote(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  if (!id) throw new Error("Silinecek not ID'si eksik");

  await supabase.from("notes").delete().match({ id, user_id: user.id });

  revalidatePath("/dashboard");
}

// Delete Selected Notes
export async function deleteSelectedNotes(noteIds: string[]) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  if (!noteIds || noteIds.length === 0) {
    throw new Error("Silinecek not seçilmedi");
  }

  await supabase
    .from("notes")
    .delete()
    .in("id", noteIds)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}

// Create Reminder
export async function createReminder(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const title = (formData.get("title") ?? "").toString();
  const due_date_local = (formData.get("due_date") ?? "").toString();

  const due_date_utc = new Date(due_date_local).toISOString();

  const { error } = await supabase.from("reminders").insert({
    title,
    due_at: due_date_utc,
    user_id: user.id,
    channel: "app",
    is_completed: false
  });

  if (error) {
    console.error("Hatırlatma oluşturma hatası:", error);
    throw new Error("Hatırlatma oluşturulamadı: " + error.message);
  }

  revalidatePath("/dashboard");
}

// Update Reminder
export async function updateReminder(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  const title = (formData.get("title") ?? "").toString();
  const due_date_local = (formData.get("due_date") ?? "").toString();

  if (!id) throw new Error("Güncellenecek hatırlatma ID'si eksik");

  const due_date_utc = new Date(due_date_local).toISOString();

  await supabase
    .from("reminders")
    .update({
      title,
      due_at: due_date_utc
    })
    .match({ id, user_id: user.id });

  revalidatePath("/dashboard");
}

// Delete Reminder
export async function deleteReminder(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  if (!id) throw new Error("Silinecek hatırlatma ID'si eksik");

  await supabase.from("reminders").delete().match({ id, user_id: user.id });

  revalidatePath("/dashboard");
}

// Create Card
export async function createCard(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const label = (formData.get("label") ?? "").toString();
  const holder_name = (formData.get("holder_name") ?? "").toString();
  const rawCardNumber = (formData.get("card_number") ?? "").toString();
  const cvv = (formData.get("cvv") ?? "").toString();
  const expiry_date = (formData.get("expiry_date") ?? "").toString();

  const [month, year] = expiry_date.split("/").map(s => s?.trim() ?? "");

  let cardBrand = "unknown";
  try {
    const binInfo = await getBinInfo(rawCardNumber);
    if (binInfo) {
      cardBrand = getCardBrandFromBin(binInfo, rawCardNumber);
    } else {
      cardBrand = detectBrandFromCardNumber(rawCardNumber);
    }
  } catch (e) {
    console.error("BIN lookup failed, using regex fallback", e);
    cardBrand = detectBrandFromCardNumber(rawCardNumber);
  }

  const last_four = rawCardNumber.slice(-4);

  let token: any;
  try {
    token = await bt.tokens.create({
      type: "card",
      data: {
        number: rawCardNumber,
        expiration_month: parseInt(month, 10),
        expiration_year: parseInt(year.length === 2 ? `20${year}` : year, 10),
        cvc: cvv,
      },
    });
  } catch (e: any) {
    console.error("BT create failed - Full error:", e);
    const errorDetail = e?.data?.errors ? JSON.stringify(e.data.errors) : e?.data?.message ? e.data.message : e?.data ? JSON.stringify(e.data) : e?.message || "Bilinmeyen hata";
    throw new Error(`Kart tokenizasyonu başarısız: ${errorDetail}`);
  }

  const { error } = await supabase
    .from("cards")
    .insert({
      label,
      holder_name_enc: holder_name,
      cvc_enc: "***",
      exp_month_enc: month,
      exp_year_enc: year,
      bt_token_id: token.id,
      last_four,
      card_brand: cardBrand,
      user_id: user.id,
    });
  if (error) {
    console.error("Supabase Insert Error:", error);
    throw new Error("Kart kaydedilemedi");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");

  return { ok: true } as const;
}

// Update Card
export async function updateCard(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  const oldBtTokenId = (formData.get("bt_token_id") ?? "").toString();
  const label = (formData.get("label") ?? "").toString();
  const holder_name = (formData.get("holder_name") ?? "").toString();
  const rawCardNumber = (formData.get("card_number") ?? "").toString();
  const cvv = (formData.get("cvv") ?? "").toString();
  const expiry_date = (formData.get("expiry_date") ?? "").toString();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  const [month, year] = expiry_date.split("/").map(s => s?.trim() ?? "");

  if (rawCardNumber) {
    let cardBrand = "unknown";
    try {
      const binInfo = await getBinInfo(rawCardNumber);
      if (binInfo) {
        cardBrand = getCardBrandFromBin(binInfo, rawCardNumber);
      } else {
        cardBrand = detectBrandFromCardNumber(rawCardNumber);
      }
    } catch (e) {
      console.error("BIN lookup failed, using regex fallback", e);
      cardBrand = detectBrandFromCardNumber(rawCardNumber);
    }

    const last_four = rawCardNumber.slice(-4);

    try {
      if (oldBtTokenId) {
        await bt.tokens.delete(oldBtTokenId);
      }

      const newToken = await bt.tokens.create({
        type: "card",
        data: {
          number: rawCardNumber,
          expiration_month: parseInt(month, 10),
          expiration_year: parseInt(year.length === 2 ? `20${year}` : year, 10),
          cvc: cvv,
        },
      });

      const { error: supaErr } = await supabase
        .from("cards")
        .update({
          label,
          holder_name_enc: holder_name,
          cvc_enc: "***",
          bt_token_id: newToken.id,
          last_four,
          exp_month_enc: month,
          exp_year_enc: year,
          card_brand: cardBrand
        })
        .match({ id, user_id: user.id });

      if (supaErr) {
        console.error("Supabase update failed:", supaErr);
        throw new Error("Kart güncellenemedi");
      }
    } catch (e: any) {
      console.error("Card update failed:", e);
      throw new Error(`Kart güncelleme başarısız: ${e?.message || "Bilinmeyen hata"}`);
    }
  } else {
    const { error: supaErr } = await supabase
      .from("cards")
      .update({
        label,
        holder_name_enc: holder_name,
        exp_month_enc: month,
        exp_year_enc: year,
      })
      .match({ id, user_id: user.id });

    if (supaErr) {
      console.error("Supabase update failed:", supaErr);
      throw new Error("Kart güncellenemedi");
    }

    if (cvv || month || year) {
      try {
        await bt.tokens.update(oldBtTokenId, {
          data: {
            expiration_month: parseInt(month, 10),
            expiration_year: parseInt(year.length === 2 ? `20${year}` : year, 10),
            ...(cvv && { cvc: cvv })
          }
        });
      } catch (e) {
        console.error("BT update failed:", e);
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
}

// Delete Card
export async function deleteCard(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  const btTokenId = (formData.get("bt_token_id") ?? "").toString();
  if (!id) throw new Error("Silinecek kart bilgileri eksik");

  try {
    if (btTokenId) {
      await bt.tokens.delete(btTokenId);
    }
  } catch (e) {
    console.error(e);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  const { error } = await supabase.from("cards").delete().match({ id, user_id: user.id });
  if (error) console.error(error);

  revalidatePath("/dashboard");
}

// Reveal Card
export async function revealCard(btTokenId: string): Promise<string> {
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const revealKey = process.env.BASIS_THEORY_REVEAL_API_KEY;
  const token = revealKey
    ? await bt.tokens.retrieve(btTokenId, { apiKey: revealKey })
    : await bt.tokens.retrieve(btTokenId);
  const full: string | undefined = (token as any)?.data?.value || (token as any)?.data?.number;
  if (!full) {
    throw new Error("Kart numarası bu anahtar ile gösterilemiyor (reveal izni yok)");
  }
  return full;
}

// Create IBAN
export async function createIban(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const label = (formData.get("label") ?? "").toString();
  const holder_name = (formData.get("holder_name") ?? "").toString();
  const number = (formData.get("number") ?? "").toString();

  const { error } = await supabase
    .from("ibans")
    .insert({ label, holder_name, iban: number, user_id: user.id });
  if (error) console.error(error);

  revalidatePath("/dashboard");
}

// Update IBAN
export async function updateIban(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const uuid = (formData.get("uuid") ?? "").toString();
  const id = (formData.get("id") ?? "").toString();
  const pkValue = uuid || id;
  const pkColumn = uuid ? "uuid" : id ? "id" : "";
  if (!pkValue || !pkColumn) throw new Error("Güncellenecek IBAN kimliği eksik");

  const label = (formData.get("label") ?? "").toString();
  const holder_name = (formData.get("holder_name") ?? "").toString();
  const number = (formData.get("number") ?? "").toString();

  const where: Record<string, any> = { user_id: user.id };
  where[pkColumn] = pkValue;

  const { error } = await supabase
    .from("ibans")
    .update({ label, holder_name, iban: number })
    .match(where);
  if (error) console.error(error);

  revalidatePath("/dashboard");
}

// Delete IBAN
export async function deleteIban(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const uuid = (formData.get("uuid") ?? "").toString();
  const id = (formData.get("id") ?? "").toString();
  const pkValue = uuid || id;
  const pkColumn = uuid ? "uuid" : id ? "id" : "";
  if (!pkValue || !pkColumn) throw new Error("Silinecek IBAN kimliği eksik");

  const where: Record<string, any> = { user_id: user.id };
  where[pkColumn] = pkValue;

  const { error } = await supabase.from("ibans").delete().match(where);
  if (error) console.error(error);

  revalidatePath("/dashboard");
}

// Create Account
export async function createAccount(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const service_name = (formData.get("service_name") ?? "").toString();
  const username = (formData.get("username") ?? "").toString();
  const password = (formData.get("password") ?? "").toString();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  let token: any;
  try {
    token = await bt.tokens.create({ type: "token", data: { value: password } });
  } catch (e) {
    console.error("BT create (account password) failed:", e);
    throw new Error("Parola tokenizasyonu başarısız");
  }

  const { error } = await supabase
    .from("accounts")
    .insert({ service: service_name, username_enc: username, user_id: user.id, bt_token_id_password: token.id });
  if (error) console.error("Supabase Insert Error (accounts):", error);

  revalidatePath("/dashboard");
}

// Update Account
export async function updateAccount(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const id = (formData.get("uuid") ?? formData.get("id") ?? "").toString();
  const service_name = (formData.get("service_name") ?? formData.get("service") ?? "").toString();
  const username = (formData.get("username") ?? formData.get("username_enc") ?? "").toString();
  const newPassword = (formData.get("password") ?? "").toString();
  const oldBtPasswordId = (formData.get("bt_token_id_password") ?? "").toString();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  const updatePayload: any = {
    service: service_name,
    username_enc: username,
  };

  if (newPassword) {
    if (oldBtPasswordId) {
      try {
        await bt.tokens.delete(oldBtPasswordId);
      } catch (e) {
        console.error("BT delete (old password) failed:", e);
      }
    }
    let newToken: any;
    try {
      newToken = await bt.tokens.create({ type: "token", data: { value: newPassword } });
      updatePayload.bt_token_id_password = newToken.id;
    } catch (e) {
      console.error("BT create (new password) failed:", e);
      throw new Error("Yeni parola token oluşturma başarısız");
    }
  }

  const { error } = await supabase
    .from("accounts")
    .update(updatePayload)
    .match({ id, user_id: user.id });
  if (error) console.error("Supabase Update Error (accounts):", error);

  revalidatePath("/dashboard");
}

// Delete Account
export async function deleteAccount(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const id = (formData.get("uuid") ?? formData.get("id") ?? "").toString();
  const btTokenId = (formData.get("bt_token_id_password") ?? "").toString();
  if (!id) throw new Error("Silinecek hesap bilgileri eksik");

  try {
    if (btTokenId) await bt.tokens.delete(btTokenId);
  } catch (e) {
    console.error("BT delete (password) failed:", e);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  const { error } = await supabase.from("accounts").delete().match({ id, user_id: user.id });
  if (error) console.error("Supabase Delete Error (accounts):", error);

  revalidatePath("/dashboard");
}

// Reveal Password
export async function revealPassword(btTokenId: string): Promise<string> {
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const revealKey = process.env.BASIS_THEORY_REVEAL_API_KEY;
  const token = revealKey
    ? await bt.tokens.retrieve(btTokenId, { apiKey: revealKey })
    : await bt.tokens.retrieve(btTokenId);
  const full: string | undefined = (token as any)?.data?.value;
  if (!full) throw new Error("Parola bu anahtar ile gösterilemiyor (reveal izni yok)");
  return full;
}

// Profile actions
export async function updateUserName(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const name = (formData.get("name") ?? "").toString();
  const { error } = await supabase.auth.updateUser({ data: { name, full_name: name } });
  if (error) console.error("Supabase updateUser (name) error:", error);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function updateUserEmail(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const new_email = (formData.get("new_email") ?? "").toString();
  const { error } = await supabase.auth.updateUser(
    { email: new_email },
    {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/email-confirmed`,
    }
  );
  if (error) console.error("Supabase updateUser (email) error:", error);
  revalidatePath("/profile");
}

export async function updateUserPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const new_password = (formData.get("new_password") ?? "").toString();
  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) console.error("Supabase updateUser (password) error:", error);
  revalidatePath("/profile");
}

export async function updateAvatarMetadata(newUrl: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: newUrl } });
  if (error) console.error("Supabase updateUser (avatar_url) error:", error);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function updateUserTheme(newTheme: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "no_user" } as const;
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, theme_mode_web: newTheme }, { onConflict: "user_id" });
  if (error) console.error("Supabase Update Error (user_preferences):", error);
  revalidatePath("/");
  return { ok: true } as const;
}

export async function updateUserAccentColor(newColor: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, reason: "no_user" } as const;

  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const color = hexRegex.test(newColor) ? newColor : "#3b82f6";

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, accent_color: color }, { onConflict: "user_id" });
  if (error) console.error("Supabase Update Error (accent_color):", error);
  revalidatePath("/");
  return { ok: true } as const;
}

export async function sendPinResetEmail(email: string) {
  try {
    const supabase = await createSupabaseServerClient();

    // Generate password reset link (we'll use this for PIN reset as well)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-pin`,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "PIN sıfırlama bağlantısı gönderildi" };
  } catch (error: any) {
    return { success: false, message: error.message || "Bir hata oluştu" };
  }
}

export async function deleteUserAccount() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Hesap silme hatası:", deleteError);
    throw new Error("Hesap silinemedi: " + deleteError.message);
  }

  await supabase.auth.signOut();
  redirect("/login");
}

// updateUserPin REMOVED - No longer needed with password auth