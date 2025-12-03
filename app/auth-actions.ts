"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Send OTP using Supabase Native Auth
export async function sendVerificationCode(email: string, isRegistration: boolean = false) {
  const supabase = await createSupabaseServerClient();
  
  console.log(`[Supabase Auth] Sending OTP to ${email} (Registration: ${isRegistration})`);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: isRegistration, // Allow create if registration flow
    },
  });

  if (error) {
    console.error("Supabase OTP Error:", error);
    // Hata mesajını kullanıcı dostu hale getir
    if (error.message.includes("Signups not allowed")) {
      return { success: false, message: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." };
    }
    // Sıklık limiti hatası
    if (error.status === 429) {
      return { success: false, message: "Çok fazla istek gönderdiniz. Lütfen 1 dakika bekleyin." };
    }
    return { success: false, message: "Kod gönderilemedi: " + error.message };
  }

  return { success: true };
}

// Verify OTP using Supabase Native Auth
export async function verifyDeviceCode(email: string, code: string, deviceId: string) {
  const supabase = await createSupabaseServerClient();
  
  // Verify the OTP
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    console.error("Verification Error:", error);
    return { success: false, message: "Geçersiz veya süresi dolmuş kod" };
  }

  if (!data.session) {
    return { success: false, message: "Doğrulama başarısız oldu (oturum oluşmadı)" };
  }

  // If verification succeeded, set the trusted device cookie
  const cookieStore = await cookies();
  
  cookieStore.set("device_verified", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3 * 24 * 60 * 60, // 3 days
  });

  return { success: true, userId: data.user?.id };
}

// Verify OTP and Complete Registration in one go
export async function verifyAndCompleteRegistration(
  email: string, 
  code: string, 
  name: string, 
  pin: string,
  avatarFile?: File | null
) {
  const supabase = await createSupabaseServerClient();
  
  // 1. Verify the OTP
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    console.error("Verification Error:", error);
    return { success: false, message: "Geçersiz veya süresi dolmuş kod" };
  }

  if (!data.session || !data.user) {
    return { success: false, message: "Doğrulama başarısız oldu" };
  }

  const userId = data.user.id;

  // 2. Validate PIN
  const cleanPin = pin.replace(/\D/g, "");
  if (!/^\d{6}$/.test(cleanPin)) {
    return { success: false, message: "PIN 6 haneli olmalı" };
  }

  try {
    // 3. Update User Password (PIN) and Metadata
    const { error: updateError } = await supabase.auth.updateUser({
      password: cleanPin,
      data: {
        full_name: name,
        name: name,
      }
    });

    if (updateError) {
      console.error("Update user error:", updateError);
      return { success: false, message: "Kullanıcı bilgileri güncellenemedi" };
    }

    // 4. Create User Preferences
    const bcrypt = await import("bcryptjs");
    const hashedPin = await bcrypt.hash(cleanPin, 10);
    
    const { error: prefError } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        pin: hashedPin,
        theme_mode_web: "dark",
        theme_mode_mobile: "dark",
      }, { onConflict: "user_id" });

    if (prefError) {
      console.error("Tercih oluşturma hatası:", prefError);
    }

    // 5. Avatar Upload (if provided)
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

    // 6. Set device verified cookie
    const cookieStore = await cookies();
    cookieStore.set("device_verified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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