'use client';

import { useEffect } from 'react';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useModalStore } from '@/lib/store/useModalStore';
import { useRouter } from 'next/navigation';
import { FileText, Wallet, Bell, Settings, LogOut, Plus, CreditCard, Landmark, Timer, ListTodo, ShieldCheck, HardDrive, CheckSquare, TrendingUp, RefreshCw, User, LayoutDashboard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createBrowserClient } from '@/lib/supabase/client';

export default function CommandPalette() {
  const router = useRouter();
  const isCommandPaletteOpen = useModalStore((state) => state.isCommandPaletteOpen);
  const closeCommandPalette = useModalStore((state) => state.closeCommandPalette);
  const toggleCommandPalette = useModalStore((state) => state.toggleCommandPalette);
  const openSettingsModal = useModalStore((state) => state.openSettingsModal);
  const openAddNoteModal = useModalStore((state) => state.openAddNoteModal);
  const openAddReminderModal = useModalStore((state) => state.openAddReminderModal);
  const openAddCardModal = useModalStore((state) => state.openAddCardModal);
  const openAddIbanModal = useModalStore((state) => state.openAddIbanModal);

  const supabase = createBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggleCommandPalette]);

  const runCommand = (callback: () => void) => {
    callback();
    closeCommandPalette();
  };

  return (
    <Command.Dialog
      open={isCommandPaletteOpen}
      onOpenChange={(open) => (open ? undefined : closeCommandPalette())}
      label="Global Command Palette"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
    >
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 light:bg-black/30 backdrop-blur-sm"
        onClick={closeCommandPalette}
        aria-hidden="true"
      />

      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 light:border-zinc-200 bg-white dark:bg-black/40 light:bg-white backdrop-blur-2xl shadow-lg dark:shadow-xl light:shadow-md"
      >
        <DialogPrimitive.Title className="sr-only">Komut Paleti</DialogPrimitive.Title>
        <Command.Input
          className="w-full border-b border-zinc-200 dark:border-white/5 light:border-zinc-200 bg-transparent px-5 py-3.5 text-[15px] text-zinc-900 dark:text-white light:text-zinc-700 placeholder-zinc-500 dark:placeholder-zinc-500 light:placeholder-zinc-500 focus:outline-none"
          placeholder="Ara veya komut çalıştır..."
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-center text-zinc-500 dark:text-zinc-500 light:text-zinc-500">
            Sonuç bulunamadı.
          </Command.Empty>

          <Command.Group heading="Navigasyon" className="p-2 text-xs text-zinc-500 dark:text-zinc-400 light:text-zinc-500">
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard'))}
              className="menu-item"
            >
              <LayoutDashboard size={16} /> Genel Bakış
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/authenticator'))}
              className="menu-item"
            >
              <ShieldCheck size={16} /> Authenticator
            </Command.Item>
             <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/drive'))}
              className="menu-item"
            >
              <HardDrive size={16} /> Drive
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/notes'))}
              className="menu-item"
            >
              <FileText size={16} /> Notlar
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/todos'))}
              className="menu-item"
            >
              <CheckSquare size={16} /> Görevler
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/wallet'))}
              className="menu-item"
            >
              <Wallet size={16} /> Cüzdan
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/cards'))}
              className="menu-item"
            >
              <CreditCard size={16} /> Kartlarım
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/markets'))}
              className="menu-item"
            >
              <TrendingUp size={16} /> Piyasalar
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/subscriptions'))}
              className="menu-item"
            >
              <RefreshCw size={16} /> Abonelikler
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/reminders'))}
              className="menu-item"
            >
              <Bell size={16} /> Hatırlatıcılar
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/dashboard/timer'))}
              className="menu-item"
            >
              <Timer size={16} /> Zamanlayıcı
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/profile'))}
              className="menu-item"
            >
              <User size={16} /> Profil
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push('/settings'))}
              className="menu-item"
            >
              <Settings size={16} /> Ayarlar
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Aksiyonlar" className="p-2 text-xs text-zinc-500 dark:text-zinc-400 light:text-zinc-500">
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/notes');
                  openAddNoteModal();
                })
              }
              className="menu-item"
            >
              <Plus size={16} /> Yeni Not Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/reminders');
                  openAddReminderModal();
                })
              }
              className="menu-item"
            >
              <Bell size={16} /> Yeni Hatırlatma Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/wallet');
                  openAddCardModal();
                })
              }
              className="menu-item"
            >
              <CreditCard size={16} /> Yeni Kart Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/wallet');
                  openAddIbanModal();
                })
              }
              className="menu-item"
            >
              <Landmark size={16} /> Yeni IBAN Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/subscriptions?action=new-subscription');
                })
              }
              className="menu-item"
            >
              <CreditCard size={16} /> Yeni Abonelik Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/subscriptions?action=new-loan');
                })
              }
              className="menu-item"
            >
              <Landmark size={16} /> Yeni Kredi Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/todos?action=new-task');
                })
              }
              className="menu-item"
            >
              <ListTodo size={16} /> Yeni Görev Ekle
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  router.push('/dashboard/timer?action=new-timer');
                })
              }
              className="menu-item"
            >
              <Timer size={16} /> Yeni Zamanlayıcı Ekle
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => openSettingsModal())}
              className="menu-item"
            >
              <Settings size={16} /> Ayarlar
            </Command.Item>
            <Command.Item
              onSelect={() =>
                runCommand(() => {
                  handleLogout();
                })
              }
              className="menu-item-danger"
            >
              <LogOut size={16} /> Çıkış Yap
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>
    </Command.Dialog >
  );
}
