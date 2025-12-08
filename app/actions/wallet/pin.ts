'use server';

import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function verifyWalletPin(pin: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Oturum açılmamış' };
  }

  const { data: pref } = await supabase
    .from('user_preferences')
    .select('wallet_pin, wallet_pin_enabled')
    .eq('user_id', user.id)
    .single();

  if (!pref?.wallet_pin_enabled || !pref?.wallet_pin) {
    return { success: false, error: 'PIN ayarlanmamış' };
  }

  // Check if the stored PIN is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars long)
  const isHashed = pref.wallet_pin.startsWith('$2') && pref.wallet_pin.length === 60;

  if (isHashed) {
    const isValid = await bcrypt.compare(pin, pref.wallet_pin);
    return { success: isValid };
  } else {
    // Fallback for legacy plain text PINs (temporarily support migration if needed, but for now just compare)
    // Ideally, we should migrate this on successful login, but for safety, we just compare.
    const isValid = pin === pref.wallet_pin;
    
    // Auto-migrate to hash if it was plain text and valid
    if (isValid) {
      const hashedPin = await bcrypt.hash(pin, 10);
      await supabase
        .from('user_preferences')
        .update({ wallet_pin: hashedPin })
        .eq('user_id', user.id);
    }
    
    return { success: isValid };
  }
}

export async function setWalletPin(pin: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Oturum açılmamış' };
  }

  try {
    const hashedPin = await bcrypt.hash(pin, 10);
    
    const { error } = await supabase
      .from('user_preferences')
      .update({ 
        wallet_pin_enabled: true, 
        wallet_pin: hashedPin 
      })
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error setting wallet PIN:', error);
    return { success: false, error: 'PIN ayarlanamadı' };
  }
}

export async function disableWalletPin(currentPin: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Oturum açılmamış' };
  }

  // Verify current PIN first
  const verifyResult = await verifyWalletPin(currentPin);
  if (!verifyResult.success) {
    return { success: false, error: 'Mevcut PIN yanlış' };
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ 
      wallet_pin_enabled: false, 
      wallet_pin: null 
    })
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: 'PIN kaldırılamadı' };
  }

  return { success: true };
}
