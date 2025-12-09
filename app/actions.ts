"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import getBasisTheory from "@/lib/basisTheory";
import bcrypt from "bcryptjs";
import { getBinInfo, getCardBrandFromBin, detectBrandFromCardNumber } from "@/lib/binLookup";
import { createClient } from "@supabase/supabase-js";

async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

async function findUserByEmail(admin: Awaited<ReturnType<typeof getSupabaseAdmin>>, email: string) {
  // Primary: getUserByEmail (fast, pagineless)
  try {
    const getter = (admin as any)?.auth?.admin?.getUserByEmail;
    if (typeof getter === "function") {
      const primary = await getter(email);
      if (primary.data?.user) return primary.data.user;
    }
  } catch (e) {
    console.error("getUserByEmail failed, falling back to listUsers:", e);
  }

  // Fallback 1: direct auth.users query (service role required)
  try {
    const { data, error } = await admin
      .from("auth.users")
      .select("id, email, user_metadata")
      .ilike("email", email)
      .maybeSingle();
    if (!error && data) return data as any;
  } catch (e) {
    console.error("auth.users direct lookup failed:", e);
  }

  // Fallback: listUsers paginated search
  try {
    let page = 1;
    const perPage = 100;
    while (true) {
      const list = await admin.auth.admin.listUsers({ page, perPage });
      const found = list.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) return found;
      if (!list.data || list.data.users.length < perPage) break; // no more pages
      page += 1;
    }
  } catch (e) {
    console.error("listUsers failed:", e);
  }

  return null;
}

// Sign up (name + pin + email + password)
export async function signUpUser(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const name = (formData.get("name") ?? "").toString();
  const pinRaw = (formData.get("pin") ?? "").toString();
  const pin = pinRaw.replace(/\D/g, "");
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN 6 haneli olmalı");
  }
  const email = (formData.get("email") ?? "").toString();
  const avatarFile = formData.get("avatar") as File | null;

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
    // Geçici bir şifre oluşturuyoruz, çünkü asıl giriş PIN ile olacak
    // Ancak Supabase Auth email/password gerektirir.
    // PIN'i hashleyip password olarak kullanacağız.
    // Bu sayede kullanıcı login olurken PIN'ini girecek.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pin, // PIN'i password olarak kullanıyoruz
      options: {
        data: {
          full_name: name,
          name: name, // Bazı yerlerde name kullanılıyor olabilir
        },
      },
    });

    if (authError) {
      throw authError;
    }

    if (authData.user) {
      const userId = authData.user.id;

      // 2. PIN'i ayrıca hashleyip user_preferences tablosuna da kaydedelim (Yedek/Güvenlik)
      // Bu adım opsiyonel ama PIN yönetimi için iyi olabilir.
      const hashedPin = await bcrypt.hash(pin, 10);

      const { error: prefError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
          pin: hashedPin,
          theme_mode_web: "light", // Varsayılan web teması
          theme_mode_mobile: "light", // Varsayılan mobil teması
        });

      if (prefError) {
        console.error("Tercih oluşturma hatası:", prefError);
        // Kritik hata değil, devam edebiliriz
      }

      // 3. Avatar yükleme (varsa)
      if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile);

        if (uploadError) {
          console.error("Avatar yükleme hatası:", uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

          const avatarUrl = publicUrlData.publicUrl;

          // Metadata güncelle
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

  // Redirect burada (try-catch dışında)
  redirect("/dashboard");
}

// Complete Registration (After OTP Verification)
export async function completeRegistration(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  // Check session (should exist after verifyOtp)
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Oturum doğrulanamadı (OTP hatası)");
  }

  const name = (formData.get("name") ?? "").toString();
  const pinRaw = (formData.get("pin") ?? "").toString();
  const pin = pinRaw.replace(/\D/g, "");
  const avatarFile = formData.get("avatar") as File | null;

  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN 6 haneli olmalı");
  }

  try {
    // 1. Update User Metadata & Password (PIN)
    // We set the password to the PIN so they can login with PIN later (using signInWithPassword)
    const { error: updateError } = await supabase.auth.updateUser({
      password: pin, 
      data: {
        full_name: name,
        name: name,
      }
    });

    if (updateError) throw updateError;

    const userId = user.id;

    // 2. Create User Preferences (PIN Hash)
    const hashedPin = await bcrypt.hash(pin, 10);
    const { error: prefError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        pin: hashedPin,
        theme_mode_web: "light",
        theme_mode_mobile: "light",
      }, { onConflict: "user_id" });

    if (prefError) console.error("Tercih oluşturma hatası:", prefError);

    // 3. Avatar Upload
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

  } catch (error: any) {
    console.error("Kayıt tamamlama hatası:", error);
    throw new Error("Kayıt tamamlanamadı: " + error.message);
  }

  redirect("/dashboard");
}

// Login (email + pin)
// Login işlemi client-side'da supabase.auth.signInWithPassword ile yapılıyor.
// Server action'a gerek yok ama gerekirse eklenebilir.

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

  const { error } = await supabase.from("notes").insert({ title, content, user_id: user.id });

  if (error) {
    console.error("Not oluşturma hatası:", error);
    throw new Error("Not oluşturulamadı: " + error.message);
  }

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

  // datetime-local formatını UTC'ye çevir
  // datetime-local formatı: "2025-11-12T20:35" (local time)
  // Supabase'e UTC olarak kaydetmeliyiz
  const due_date_utc = new Date(due_date_local).toISOString();

  // Mobil uygulamayla uyumlu format: due_at, channel, is_completed
  // channel: "app" olarak ayarla ki mobil uygulama bildirim kursun
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

  // datetime-local formatını UTC'ye çevir
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

// Toggle Reminder Status
export async function toggleReminderStatus(id: string, is_completed: boolean) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const { error } = await supabase
    .from("reminders")
    .update({ is_completed })
    .match({ id, user_id: user.id });

  if (error) {
    console.error("Hatırlatma durum güncelleme hatası:", error);
    throw new Error("Hatırlatma güncellenemedi");
  }

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

// Create Card (Basis Theory + Supabase)
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
  const expiry_date = (formData.get("expiry_date") ?? "").toString(); // MM/YY format

  // Parse Expiry (format is MM/YY from form)
  const [month, year] = expiry_date.split("/").map(s => s?.trim() ?? "");

  // Detect Brand
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

  // Last 4
  const last_four = rawCardNumber.slice(-4);

  // Tokenize with Basis Theory
  let token: any;
  try {
    console.log("Creating BT token with:", {
      number: rawCardNumber,
      expiration_month: month,
      expiration_year: year,
      cvc: cvv,
    });

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
    console.error("BT error data:", e?.data);
    console.error("BT error status:", e?.status);
    console.error("BT error stringified:", JSON.stringify(e, null, 2));

    const errorDetail = e?.data?.errors
      ? JSON.stringify(e.data.errors)
      : e?.data?.message
      ? e.data.message
      : e?.data
      ? JSON.stringify(e.data)
      : e?.message || "Bilinmeyen hata";

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
  const expiry_date = (formData.get("expiry_date") ?? "").toString(); // MM/YY format

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı");

  // Parse Expiry (format is MM/YY from form)
  const [month, year] = expiry_date.split("/").map(s => s?.trim() ?? "");

  // If card number changed, create new token and delete old one
  if (rawCardNumber) {
    // Detect Brand
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
      // Delete old token
      if (oldBtTokenId) {
        await bt.tokens.delete(oldBtTokenId);
      }

      // Create new token
      const newToken = await bt.tokens.create({
        type: "card",
        data: {
          number: rawCardNumber,
          expiration_month: parseInt(month, 10),
          expiration_year: parseInt(year.length === 2 ? `20${year}` : year, 10),
          cvc: cvv,
        },
      });

      // Update Supabase with new token
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
    // Only update metadata (label, holder_name) - no card number change
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

    // Update BT token with new expiry and CVV if provided
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

// Create Account (Password Manager)
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
    // Delete old token if exists
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
  // Oturum yoksa sessizce çık: login/anon sayfalarda tema sadece UI'da değişebilir
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

  // Basic validation: accept hex like #RRGGBB or #RGB
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const color = hexRegex.test(newColor) ? newColor : "#3b82f6";

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, accent_color: color }, { onConflict: "user_id" });
  if (error) console.error("Supabase Update Error (accent_color):", error);
  revalidatePath("/");
  return { ok: true } as const;
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

  // Admin client oluştur (Service Role Key ile)
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

  // Kullanıcıyı sil
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Hesap silme hatası:", deleteError);
    throw new Error("Hesap silinemedi: " + deleteError.message);
  }

  // Çıkış yap ve yönlendir
  await supabase.auth.signOut();
  redirect("/login");
}



export async function updateUserPin(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Oturum bulunamadı");
  }

  const newPin = (formData.get("new_pin") ?? "").toString();
  const confirmPin = (formData.get("confirm_pin") ?? "").toString();
  const updateAuthPassword = (formData.get("update_auth_password") ?? "true").toString() === "true";

  // Validation
  if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
    throw new Error("Yeni PIN 6 haneli olmalı ve sadece rakamlardan oluşmalı");
  }

  if (newPin !== confirmPin) {
    throw new Error("PIN'ler eşleşmiyor");
  }

  // 1. Update Supabase Auth Password (OPTIONAL)
  if (updateAuthPassword) {
    const { error: authError } = await supabase.auth.updateUser({
      password: newPin
    });

    if (authError) {
      throw new Error("Auth şifresi güncellenemedi: " + authError.message);
    }
  }

  // 2. Update Database Hash (user_preferences)
  const hashedNewPin = await bcrypt.hash(newPin, 10);

  // Check if preferences exist
  const { data: existingPrefs, error: checkError } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw checkError;
  }

  // Update or insert the PIN
  if (existingPrefs) {
    const { error } = await supabase
      .from("user_preferences")
      .update({ pin: hashedNewPin })
      .eq("user_id", user.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_preferences")
      .insert({ user_id: user.id, pin: hashedNewPin });

    if (error) throw error;
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

// E-posta adresinin sistemde kayıtlı olup olmadığını kontrol et
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const user = await findUserByEmail(supabaseAdmin, email);
    return !!user;
  } catch (err) {
    console.error("E-posta kontrol hatası:", err);
    return false;
  }
}

// Kullanıcının avatar URL'si ve ismini email ile al
export async function getUserAvatarByEmail(email: string) {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const user = await findUserByEmail(supabaseAdmin, email);
    if (user) {
      const meta = user.user_metadata || {};
      return {
        avatarUrl: (meta.avatar_url || null) as string | null,
        userName: (meta.name || meta.full_name || meta.username || null) as string | null,
      };
    }
  } catch (err) {
    console.error("Avatar yüklenirken hata:", err);
  }

  return { avatarUrl: null, userName: null };
}

// E-postaya göre kullanıcının tema tercihlerini getir (light/dark)
export async function getUserThemeByEmail(email: string): Promise<"light" | "dark" | null> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const user = await findUserByEmail(supabaseAdmin, email);
    if (!user?.id) return null;

    const { data: prefRow, error: prefErr } = await supabaseAdmin
      .from("user_preferences")
      .select("theme_mode_web")
      .eq("user_id", user.id)
      .single();
    if (prefErr) return null;
    const mode = (prefRow as any)?.theme_mode_web;
    if (mode === "light" || mode === "dark") return mode;
    return null;
  } catch (e) {
    console.error("getUserThemeByEmail error:", e);
    return null;
  }
}

// Tek seferde kullanıcı var mı, avatar, isim ve tema bilgisi
export async function getUserAuthInfo(email: string): Promise<UserAuthInfo> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const user = await findUserByEmail(supabaseAdmin, email);
    if (!user) {
      return { exists: false, userId: null, avatarUrl: null, userName: null, theme: null };
    }

    // Get user preferences for theme
    const { data: prefRow, error: prefErr } = await supabaseAdmin
      .from("user_preferences")
      .select("theme_mode_web")
      .eq("user_id", user.id)
      .single();

    let theme: "light" | "dark" | null = null;
    if (!prefErr) {
      const mode = (prefRow as any)?.theme_mode_web;
      if (mode === "light" || mode === "dark") {
        theme = mode;
      }
    }

    // Get user profile for avatar and name
    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("id", user.id)
      .single();

    // Try multiple avatar sources: profiles table -> user_metadata -> storage
    let avatarUrl = (profileRow as any)?.avatar_url || null;
    
    if (!avatarUrl) {
      // Try user_metadata
      avatarUrl = user.user_metadata?.avatar_url || null;
    }
    
    if (!avatarUrl) {
      // Try storage bucket - check if avatar exists
      const { data: storageData } = supabaseAdmin.storage
        .from("avatars")
        .getPublicUrl(`${user.id}/avatar.png`);
      
      if (storageData?.publicUrl) {
        // Verify the file exists by checking with a HEAD request pattern
        avatarUrl = storageData.publicUrl;
      }
    }

    const userName = (profileRow as any)?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || null;

    return { exists: true, userId: user.id, avatarUrl, userName, theme };
  } catch (e) {
    console.error("getUserAuthInfo error:", e);
    return { exists: false, userId: null, avatarUrl: null, userName: null, theme: null };
  }
}

// Cihaz güveni: kayıtlı cihaz mı?
export async function checkDeviceTrust(email: string, deviceId: string): Promise<DeviceTrustResult> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const user = await findUserByEmail(supabaseAdmin, email);
    if (!user) return { exists: false, trusted: false };

    const meta = user.user_metadata || {};
    const trustedDevices: string[] = Array.isArray(meta.trusted_devices) ? meta.trusted_devices : [];
    const trusted = trustedDevices.includes(deviceId);
    return { exists: true, trusted };
  } catch (e) {
    console.error("checkDeviceTrust error:", e);
    return { exists: false, trusted: false };
  }
}

// Giriş sonrası cihazı güvenilir listesine ekle
export async function registerTrustedDevice(deviceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata || {};
  const trustedDevices: string[] = Array.isArray(meta.trusted_devices) ? meta.trusted_devices : [];
  if (trustedDevices.includes(deviceId)) return;

  const nextList = [...trustedDevices, deviceId].slice(-10); // son 10 cihaz
  const { error } = await supabase.auth.updateUser({
    data: {
      ...meta,
      trusted_devices: nextList,
    }
  });

  if (error) {
    console.error("registerTrustedDevice error:", error);
  }
}

// Update Notification Settings
export async function updateNotificationSettings(settings: {
  email_notifications: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    data: {
      notification_settings: settings
    }
  });

  if (error) {
    console.error("Notification settings update error:", error);
    throw new Error("Bildirim ayarları güncellenemedi");
  }

  revalidatePath("/dashboard");
}

// ============================================
// 2FA / OTP CODES ACTIONS
// ============================================

import QRCode from "qrcode";

// Get OTP QR Code (Server-side QR generation for secure export)
export async function getOTPQRCode(id: string): Promise<string> {
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

  // Fetch OTP record from database
  const { data: otpRecord, error: fetchError } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id) // Ensure user owns this record
    .single();

  if (fetchError || !otpRecord) {
    throw new Error("2FA kaydı bulunamadı");
  }

  // Reveal secret from Basis Theory
  const revealKey = process.env.BASIS_THEORY_REVEAL_API_KEY;
  const token = revealKey
    ? await bt.tokens.retrieve(otpRecord.bt_token_id_secret, { apiKey: revealKey })
    : await bt.tokens.retrieve(otpRecord.bt_token_id_secret);

  const secret: string | undefined = (token as any)?.data?.value || (token as any)?.data;
  if (!secret) {
    throw new Error("Secret anahtarı alınamadı");
  }

  // Build otpauth URL
  const issuer = otpRecord.issuer || otpRecord.service_name;
  const account = otpRecord.account_name || "unknown";
  const label = encodeURIComponent(`${issuer}:${account}`);
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedSecret = secret.replace(/\s/g, "").toUpperCase();

  const otpauthUrl = `otpauth://totp/${label}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=${otpRecord.algorithm || "SHA1"}&digits=${otpRecord.digits || 6}&period=${otpRecord.period || 30}`;

  // Generate QR code as base64 PNG
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  // Return ONLY the base64 image, never the secret
  return qrDataUrl;
}

// Create OTP Code
export async function createOTPCode(formData: FormData) {
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

  const service_name = (formData.get("service_name") ?? "").toString();
  const account_name = (formData.get("account_name") ?? "").toString();
  const issuer = (formData.get("issuer") ?? "").toString();
  const secret = (formData.get("secret") ?? "").toString();
  const algorithm = (formData.get("algorithm") ?? "SHA1").toString();
  const digits = parseInt((formData.get("digits") ?? "6").toString());
  const period = parseInt((formData.get("period") ?? "30").toString());
  const category = (formData.get("category") ?? "").toString();
  const notes = (formData.get("notes") ?? "").toString();

  // Tokenize secret with Basis Theory
  const token = await bt.tokens.create({
    type: "token",
    data: secret,
  });

  // Insert into database
  const { error } = await supabase.from("otp_codes").insert({
    user_id: user.id,
    service_name,
    account_name: account_name || null,
    issuer: issuer || null,
    bt_token_id_secret: token.id,
    algorithm,
    digits,
    period,
    category: category || null,
    notes: notes || null,
  });

  if (error) {
    console.error("OTP code insert error:", error);
    throw new Error("2FA kodu eklenemedi");
  }

  revalidatePath("/dashboard/authenticator");
}

// Reveal OTP Secret
export async function revealOTPSecret(btTokenId: string): Promise<string> {
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const revealKey = process.env.BASIS_THEORY_REVEAL_API_KEY;
  const token = revealKey
    ? await bt.tokens.retrieve(btTokenId, { apiKey: revealKey })
    : await bt.tokens.retrieve(btTokenId);

  const secret: string | undefined = (token as any)?.data?.value || (token as any)?.data;
  if (!secret) {
    throw new Error("Secret bu anahtar ile gösterilemiyor");
  }
  return secret;
}

// Delete OTP Code
export async function deleteOTPCode(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const bt = await getBasisTheory();

  if (!bt) {
    throw new Error("Basis Theory istemcisi oluşturulamadı");
  }

  const id = (formData.get("id") ?? "").toString();
  const btTokenId = (formData.get("bt_token_id_secret") ?? "").toString();

  if (!id) throw new Error("Silinecek 2FA kodu bilgileri eksik");

  try {
    if (btTokenId) {
      await bt.tokens.delete(btTokenId);
    }
  } catch (e) {
    console.error("BT token delete failed:", e);
  }

  const { error } = await supabase.from("otp_codes").delete().eq("id", id);

  if (error) console.error(error);

  revalidatePath("/dashboard/authenticator");
}

// Update OTP Code
export async function updateOTPCode(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const id = (formData.get("id") ?? "").toString();
  const service_name = (formData.get("service_name") ?? "").toString();
  const account_name = (formData.get("account_name") ?? "").toString();
  const issuer = (formData.get("issuer") ?? "").toString();
  const category = (formData.get("category") ?? "").toString();
  const notes = (formData.get("notes") ?? "").toString();

  if (!id) throw new Error("ID bulunamadı");

  const { error } = await supabase
    .from("otp_codes")
    .update({
      service_name,
      account_name: account_name || null,
      issuer: issuer || null,
      category: category || null,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) {
    console.error("OTP code update error:", error);
    throw new Error("2FA kodu güncellenemedi");
  }

  revalidatePath("/dashboard/authenticator");
}
