'use client';

import { useState, useRef, useEffect } from 'react';
import { X, User, Lock, Camera, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { updateAvatarMetadata, updateUserName, updateUserEmail, updateUserPin } from '@/app/actions';
import { toast } from 'react-hot-toast';
import bcrypt from 'bcryptjs';
import { motion } from 'framer-motion';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
  onUpdate?: () => void;
}

type ProfileSection = 'account' | 'security';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [activeSection, setActiveSection] = useState<ProfileSection>('account');
  const supabase = createBrowserClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Info States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState(''); // E-posta doğrulaması bekleyen adres
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // Avatar States
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('');

  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PIN States
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [securityTab, setSecurityTab] = useState<'password' | 'pin'>('password');

  const newPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Update states when user prop changes
  useEffect(() => {
    if (user) {
      const initialName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const initialEmail = user.email || '';
      setName(initialName);
      setEmail(initialEmail);
      setOriginalName(initialName);
      setOriginalEmail(initialEmail);
      setCurrentAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  // Listen for auth state changes (email verification) - Real-time
  useEffect(() => {
    if (!isOpen || !emailVerificationSent || !pendingEmail) return;

    console.log('🔔 Listening for email verification...');
    console.log('📧 Current email:', originalEmail);
    console.log('⏳ Waiting for:', pendingEmail);

    // Poll user session every 2 seconds to check for email change
    const pollInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const currentEmail = session.user.email;
        console.log('🔍 Checking session email:', currentEmail);

        // Check if the current email matches the pending email we're waiting for
        if (currentEmail && currentEmail === pendingEmail) {
          console.log('✅ Email verified and changed to:', currentEmail);

          // Email was verified!
          setEmailVerified(true);
          setEmailVerificationSent(false);
          setOriginalEmail(currentEmail);
          setEmail(currentEmail);
          setPendingEmail(''); // Clear pending email

          // Show success toast
          toast.success('E-posta başarıyla doğrulandı!', {
            duration: 3000,
            position: 'top-center',
          });

          // Refresh router to update server state
          router.refresh();

          // Call onUpdate if provided
          onUpdate?.();

          // Clear interval after success
          clearInterval(pollInterval);
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      console.log('🛑 Stopped listening for email verification');
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, emailVerificationSent, pendingEmail]);

  if (!isOpen || !user) return null;

  const isNameDirty = name.trim() !== originalName.trim();
  const isEmailDirty = email.trim() !== originalEmail.trim();

  const navigationItems = [
    { id: 'account' as ProfileSection, label: 'Hesap Bilgileri', icon: User },
    { id: 'security' as ProfileSection, label: 'Güvenlik', icon: Lock },
  ];

  // Handle Avatar Change
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // Handle Avatar Remove
  const handleAvatarRemove = async () => {
    if (!currentAvatarUrl) return;

    setIsUploadingAvatar(true);
    try {
      // Set avatar_url to null in user metadata
      await updateAvatarMetadata('');

      // Show toast
      toast.success('Profil resmi kaldırıldı!', {
        duration: 1500,
        position: 'top-center',
      });

      // Update local state
      setCurrentAvatarUrl('');
      setAvatarFile(null);
      setAvatarPreview(null);

      // Update user metadata in current component
      if (user && user.user_metadata) {
        user.user_metadata.avatar_url = '';
      }

      // Wait a bit for Supabase to propagate the change
      await new Promise(resolve => setTimeout(resolve, 300));

      // Dispatch event to update header/other components
      window.dispatchEvent(new CustomEvent('profile-updated'));

      // Refresh router
      router.refresh();

      // Trigger parent component refresh
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      console.error('Avatar remove error:', err);
      toast.error('Profil resmi kaldırılamadı');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user?.id) return;

    setIsUploadingAvatar(true);
    try {
      const original = avatarFile.name;
      const dot = original.lastIndexOf('.');
      const ext = dot > -1 ? original.slice(dot + 1).toLowerCase() : 'png';
      const base = (dot > -1 ? original.slice(0, dot) : original)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '');
      const safeName = `${Date.now()}_${base || 'avatar'}.${ext}`;
      const path = `${user.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await updateAvatarMetadata(publicUrl);

      // Show toast
      toast.success('Profil resmi güncellendi!', {
        duration: 1500,
        position: 'top-center',
      });

      // Update local state to show new avatar immediately
      setCurrentAvatarUrl(publicUrl);

      // Update user metadata in current component
      if (user && user.user_metadata) {
        user.user_metadata.avatar_url = publicUrl;
      }

      setAvatarFile(null);
      setAvatarPreview(null);

      // Wait a bit for Supabase to propagate the change
      await new Promise(resolve => setTimeout(resolve, 300));

      // Dispatch event to update header/other components
      window.dispatchEvent(new CustomEvent('profile-updated'));

      // Refresh router to update UI without full page reload
      router.refresh();

      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Resim yüklenemedi');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle Name Update
  const handleNameUpdate = async () => {
    if (!name.trim()) {
      toast.error('İsim boş olamaz');
      return;
    }

    setIsUpdatingName(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      await updateUserName(formData);

      // Show toast
      toast.success('İsim güncellendi!', {
        duration: 1500,
        position: 'top-center',
      });

      // Update user metadata in current component
      if (user && user.user_metadata) {
        user.user_metadata.full_name = name;
        user.user_metadata.name = name;
      }

      // Wait a bit for Supabase to propagate the change
      await new Promise(resolve => setTimeout(resolve, 300));

      // Dispatch event to update header/other components
      window.dispatchEvent(new CustomEvent('profile-updated'));

      // Refresh router to update UI without full page reload
      router.refresh();

      // Trigger parent component refresh if callback provided
      if (onUpdate) {
        onUpdate();
      }

      setOriginalName(name.trim());
      setName(name.trim());
    } catch (err: any) {
      toast.error(err?.message || 'İsim güncellenemedi');
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Handle Email Update
  const handleEmailUpdate = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Geçerli bir e-posta girin');
      return;
    }

    setIsUpdatingEmail(true);
    setEmailVerificationSent(false);
    setEmailVerified(false);
    try {
      const formData = new FormData();
      formData.append('new_email', email);
      await updateUserEmail(formData);

      // Save the pending email that's waiting for verification
      setPendingEmail(email.trim());
      setEmailVerificationSent(true);

      toast.success('✅ Doğrulama e-postası başarıyla gönderildi! E-postanızı kontrol edin.', {
        duration: 4000,
        position: 'top-center',
      });

      // Don't close modal - keep it open so user can see the success message
    } catch (err: any) {
      toast.error(err?.message || 'E-posta güncellenemedi');
      setEmailVerificationSent(false);
      setPendingEmail('');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Handle Password Update - DUAL UPDATE (Auth Password + Database Hash)
  const handlePasswordUpdate = async () => {
    // Validation
    if (newPassword.length < 6) {
      toast.error('Yeni parola en az 6 karakter olmalı');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Yeni parolalar eşleşmiyor');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      console.log('Starting Password update for user:', user.id);

      // ========================================
      // STEP 1: Update Supabase Auth Password
      // ========================================
      console.log('STEP 1: Updating Supabase Auth Password...');
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) {
        console.error('Auth Password Update Failed:', authError);
        throw new Error('Auth Password güncellenemedi: ' + authError.message);
      }

      console.log('✅ Auth Password updated successfully.');

      // ========================================
      // STEP 2: Update Database Password Hash
      // ========================================
      console.log('STEP 2: Hashing Password for database storage...');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log('Updating user_preferences table for user:', user.id);

      // Update the user_preferences table
      const { data, error: dbError } = await supabase
        .from('user_preferences')
        .update({ pin: hashedPassword })
        .eq('user_id', user.id)
        .select();

      console.log('Database Update Result:', data, dbError);

      if (dbError) {
        console.error('Database Password Hash Update Failed:', dbError);
        throw new Error('Database Password Hash güncellenemedi: ' + dbError.message);
      }

      // Check if no rows were updated (user_preferences record doesn't exist)
      if (!data || data.length === 0) {
        console.error('No user_preferences record found for user:', user.id);

        // Try to INSERT instead of UPDATE
        console.log('Attempting to INSERT new user_preferences record...');
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, pin: hashedPassword });

        if (insertError) {
          console.error('Insert Failed:', insertError);
          alert("Kullanıcı ayarları bulunamadı ve oluşturulamadı (user_preferences)!");
          throw new Error('Kullanıcı ayarları oluşturulamadı');
        }

        console.log('✅ New user_preferences record created successfully.');
      } else {
        console.log('✅ Database Password Hash updated successfully.');
      }

      // Success!
      toast.success('Parola başarıyla güncellendi!', {
        duration: 2000,
        position: 'top-center',
      });

      // Clear inputs
      setNewPassword('');
      setConfirmPassword('');

      // Refresh router to ensure server state is synced
      router.refresh();

      // Don't close modal - keep it open so user can see success
    } catch (err: any) {
      console.error('Password Update Error:', err);
      toast.error(err?.message || 'Parola güncellenemedi');
      alert('Parola güncelleme başarısız: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // PIN Update Handler
  const handlePinUpdate = async () => {
    if (!newPin || !confirmPin) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error('PIN 6 haneli ve sadece rakamlardan oluşmalıdır');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('PIN kodları eşleşmiyor');
      return;
    }

    setIsUpdatingPin(true);

    try {
      const formData = new FormData();
      formData.append('new_pin', newPin);
      formData.append('confirm_pin', confirmPin);
      formData.append('update_auth_password', 'false');

      await updateUserPin(formData);

      toast.success('PIN başarıyla güncellendi!', {
        duration: 2000,
        position: 'top-center',
      });

      // Clear inputs
      setNewPin('');
      setConfirmPin('');

      // Refresh router
      router.refresh();
    } catch (err: any) {
      console.error('PIN Update Error:', err);
      toast.error(err?.message || 'PIN güncellenemedi');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        const hasChanges = isNameDirty || isEmailDirty || avatarFile !== null;
        const isSaving = isUpdatingName || isUpdatingEmail || isUploadingAvatar;

        return (
          <div className="space-y-8 max-w-xl">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 pb-8 border-b border-zinc-200 dark:border-white/5">
              <div
                className="group relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-zinc-200 dark:ring-zinc-900 cursor-pointer transition-all hover:ring-zinc-300 dark:hover:ring-white/20"
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : currentAvatarUrl ? (
                  <Image
                    src={currentAvatarUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    key={currentAvatarUrl}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-3xl font-bold text-zinc-400 dark:text-white/50">
                    {(name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Profil Fotoğrafı</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-500 mb-3">Kişisel fotoğrafınızı güncelleyin</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/10 text-xs font-medium text-zinc-900 dark:text-white hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-200"
                  >
                    Fotoğraf Yükle
                  </button>
                  {currentAvatarUrl && (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={isUploadingAvatar}
                      className="px-4 py-1.5 rounded-full bg-transparent border border-transparent text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingAvatar ? 'Kaldırılıyor...' : 'Kaldır'}
                    </button>
                  )}
                </div>
              </div>

              <input
                key={`file-input-${isOpen}`}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="space-y-6">
              {/* Name Input Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider ml-1">Görünen İsim</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 transition-colors group-focus-within:text-zinc-900 dark:group-focus-within:text-white" />
                  <input
                    type="text"
                    value={name || ''}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adınız"
                    className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-sm focus:border-zinc-400 dark:focus:border-white/30 focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Email Input Section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider ml-1">E-posta Adresi</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                    <span className="text-zinc-500 text-lg font-medium group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">@</span>
                  </div>
                  <input
                    type="email"
                    value={email || ''}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailVerificationSent(false); // Reset verification status when email changes
                      setEmailVerified(false); // Reset verified status when email changes
                      setPendingEmail(''); // Clear pending email when user edits
                    }}
                    placeholder="E-posta adresiniz"
                    className="w-full h-12 pl-12 pr-4 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-sm focus:border-zinc-400 dark:focus:border-white/30 focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                {emailVerified ? (
                  <div
                    key="email-verified"
                    className="flex items-center gap-2 text-xs text-emerald-500/90 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30 animate-fade-in"
                  >
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 animate-scale-in">
                      <Check className="h-3 w-3 text-emerald-400 stroke-[3]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-emerald-400">E-posta başarıyla doğrulandı!</span>
                      <span className="text-emerald-400/80">
                        Yeni e-posta adresiniz: <span key={email} className="font-mono font-semibold animate-slide-in inline-block">{email}</span>
                      </span>
                    </div>
                  </div>
                ) : emailVerificationSent ? (
                  <div
                    key="email-sent"
                    className="flex items-center gap-2 text-xs text-green-500/80 bg-green-500/10 p-3 rounded-lg border border-green-500/20 animate-fade-in"
                  >
                    <Check className="h-4 w-4 flex-shrink-0 animate-scale-in" />
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">Doğrulama e-postası gönderildi!</span>
                      <span className="text-green-400/70">
                        <span key={email} className="font-mono font-medium animate-slide-in inline-block">{email}</span> adresine doğrulama linki gönderdik.
                      </span>
                    </div>
                  </div>
                ) : isEmailDirty ? (
                  <div
                    key="email-pending"
                    className="flex items-center gap-2 text-xs text-blue-500/80 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 animate-fade-in"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0 animate-pulse" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">E-posta değişikliği bekleniyor</span>
                      <span className="text-blue-400/60 text-[10px]">Kaydet butonuna tıklayarak doğrulama e-postası alabilirsiniz</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={async () => {
                  if (avatarFile) await handleAvatarUpload();
                  if (isNameDirty) await handleNameUpdate();
                  if (isEmailDirty) await handleEmailUpdate();
                }}
                disabled={!hasChanges || isSaving}
                className={`w-full h-12 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${hasChanges && !isSaving
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-900/10 dark:shadow-white/5 transform hover:-translate-y-0.5'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Değişiklikleri Kaydet'
                )}
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8 max-w-xl mx-auto pt-4">
            {/* Tab Switcher */}
            <div className="flex items-center justify-center gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-white/5">
              <button
                onClick={() => setSecurityTab('password')}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  securityTab === 'password'
                    ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Parola
              </button>
              <button
                onClick={() => setSecurityTab('pin')}
                className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  securityTab === 'pin'
                    ? 'bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                PIN Kodu
              </button>
            </div>

            {securityTab === 'password' ? (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Güvenlik Parolası</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Hesap güvenliğiniz için parolanızı belirleyin</p>
                </div>

                <div className="space-y-6">
                  {/* New Password */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Yeni Parola</label>
                    <div className="relative group w-full">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword || ''}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 pl-4 pr-12 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-sm focus:border-zinc-400 dark:focus:border-white/30 focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Parola Tekrar</label>
                    <div className="relative group w-full">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword || ''}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 pl-4 pr-12 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white text-sm focus:border-zinc-400 dark:focus:border-white/30 focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none focus:ring-0 transition-all duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 max-w-xs mx-auto">
                  <button
                    onClick={handlePasswordUpdate}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword || newPassword.length < 6 || confirmPassword.length < 6}
                    className={`w-full h-14 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${!isUpdatingPassword && newPassword && confirmPassword && newPassword.length >= 6 && confirmPassword.length >= 6
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-900/10 dark:shadow-white/10 transform hover:-translate-y-0.5'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      }`}
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        GÜNCELLENİYOR...
                      </>
                    ) : (
                      'PAROLA GÜNCELLE'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">PIN Kodu</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Hızlı erişim için 6 haneli PIN kodunuzu belirleyin</p>
                </div>

                <div className="space-y-6">
                  {/* New PIN */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest text-center">Yeni PIN</label>
                    <div className="flex gap-2 justify-center">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <input
                          key={i}
                          ref={(el) => { newPinRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={newPin[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const char = val.slice(-1);
                            let currentArr = newPin.split('');
                            while (currentArr.length < i) currentArr.push('');
                            currentArr[i] = char;
                            setNewPin(currentArr.join('').slice(0, 6));
                            if (char && i < 5) newPinRefs.current[i + 1]?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (!newPin[i] && i > 0) {
                                e.preventDefault();
                                const arr = newPin.split('');
                                if (i - 1 < arr.length) {
                                  arr[i - 1] = '';
                                  setNewPin(arr.join(''));
                                }
                                newPinRefs.current[i - 1]?.focus();
                              }
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            setNewPin(pasted);
                          }}
                          className="w-12 h-14 text-center text-xl font-bold bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:border-zinc-900 dark:focus:border-white focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Confirm PIN */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-widest text-center">PIN Tekrar</label>
                    <div className="flex gap-2 justify-center">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <input
                          key={i}
                          ref={(el) => { confirmPinRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={confirmPin[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const char = val.slice(-1);
                            let currentArr = confirmPin.split('');
                            while (currentArr.length < i) currentArr.push('');
                            currentArr[i] = char;
                            setConfirmPin(currentArr.join('').slice(0, 6));
                            if (char && i < 5) confirmPinRefs.current[i + 1]?.focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (!confirmPin[i] && i > 0) {
                                e.preventDefault();
                                const arr = confirmPin.split('');
                                if (i - 1 < arr.length) {
                                  arr[i - 1] = '';
                                  setConfirmPin(arr.join(''));
                                }
                                confirmPinRefs.current[i - 1]?.focus();
                              }
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                            setConfirmPin(pasted);
                          }}
                          className="w-12 h-14 text-center text-xl font-bold bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:border-zinc-900 dark:focus:border-white focus:bg-zinc-50 dark:focus:bg-zinc-900/50 focus:outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 max-w-xs mx-auto">
                  <button
                    onClick={handlePinUpdate}
                    disabled={isUpdatingPin || !newPin || !confirmPin || newPin.length !== 6 || confirmPin.length !== 6}
                    className={`w-full h-14 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${!isUpdatingPin && newPin && confirmPin && newPin.length === 6 && confirmPin.length === 6
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-900/10 dark:shadow-white/10 transform hover:-translate-y-0.5'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                      }`}
                  >
                    {isUpdatingPin ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        GÜNCELLENİYOR...
                      </>
                    ) : (
                      'PIN GÜNCELLE'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full h-full md:w-[850px] md:h-[600px] md:mx-4"
      >
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden md:flex h-full bg-zinc-50/95 dark:bg-[#09090b] rounded-3xl border border-zinc-300/50 dark:border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* LEFT PANEL - SIDEBAR */}
          <div className="w-[280px] bg-white/40 dark:bg-zinc-900/20 border-r border-zinc-300/50 dark:border-white/5 p-6 flex flex-col backdrop-blur-xl">
            {/* Header */}
            <div className="mb-10 px-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Ayarlar</h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-1">Hesap ve tercihlerinizi yönetin</p>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg shadow-zinc-900/10 dark:shadow-white/5'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white dark:text-black' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'} transition-colors`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer - User Info */}
            <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-white/5 px-2">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-default">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-400 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-zinc-900 dark:text-white text-xs font-bold ring-2 ring-zinc-200 dark:ring-black">
                  {name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{name || 'User'}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - CONTENT */}
          <div className="flex-1 flex flex-col bg-transparent dark:bg-[#09090b] relative">
            {/* Close Button */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-12 pb-10 pt-14 overflow-y-auto custom-scrollbar">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="flex md:hidden flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 backdrop-blur-md z-20">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Profil</h1>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-white/10">
            <div className="flex overflow-x-auto scrollbar-none p-2 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md'
                        : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-black custom-scrollbar pb-24">
             {renderContent()}
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        @media (prefers-color-scheme: dark) {
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
