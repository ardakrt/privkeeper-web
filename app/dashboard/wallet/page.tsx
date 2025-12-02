
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase/client';
import CardsPageManager from '@/components/CardsPageManager';
import IbansPageManager from '@/components/IbansPageManager';
import AccountsPageManager from '@/components/AccountsPageManager';
import { useRouter } from 'next/navigation';
import { useModalStore } from '@/lib/store/useModalStore';
import { getCardsCache, getIbansCache } from '@/components/DataPreloader';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function WalletPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [ibans, setIbans] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // PIN States
  const [isPinRequired, setIsPinRequired] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [checkingPin, setCheckingPin] = useState(true);
  const cardsRef = useRef<any>(null);
  const ibansRef = useRef<any>(null);
  const accountsRef = useRef<any>(null);
  const supabase = createBrowserClient();
  const router = useRouter();

  const isAddCardModalOpen = useModalStore((state) => state.isAddCardModalOpen);
  const openAddCardModal = useModalStore((state) => state.openAddCardModal);
  const isAddIbanModalOpen = useModalStore((state) => state.isAddIbanModalOpen);
  const openAddIbanModal = useModalStore((state) => state.openAddIbanModal);

  const [currentView, setCurrentView] = useState<"list" | "create">("list");

  const handleViewChange = (view: "list" | "create") => {
    setCurrentView(view);
  };

  // Reset view when tab changes
  useEffect(() => {
    setCurrentView("list");
  }, [activeTab]);

  // Switch to relevant tab if global modal is opened
  useEffect(() => {
    if (isAddCardModalOpen) {
      setActiveTab('cards');
    }
  }, [isAddCardModalOpen]);

  useEffect(() => {
    if (isAddIbanModalOpen) {
      setActiveTab('ibans');
    }
  }, [isAddIbanModalOpen]);

  // Check PIN requirement on mount
  useEffect(() => {
    const checkPinRequirement = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: pref } = await supabase
        .from('user_preferences')
        .select('wallet_pin_enabled, wallet_pin')
        .eq('user_id', user.id)
        .single();

      if (pref?.wallet_pin_enabled && pref?.wallet_pin) {
        setIsPinRequired(true);
        setStoredPin(pref.wallet_pin);
        
        // Check session storage for already verified
        const sessionVerified = sessionStorage.getItem('wallet_pin_verified');
        if (sessionVerified === 'true') {
          setIsPinVerified(true);
        }
      } else {
        setIsPinVerified(true);
      }
      setCheckingPin(false);
    };

    checkPinRequirement();
  }, [router, supabase]);

  const handlePinSubmit = () => {
    if (pinInput === storedPin) {
      setIsPinVerified(true);
      setPinError(false);
      sessionStorage.setItem('wallet_pin_verified', 'true');
      toast.success('Cüzdan kilidi açıldı');
    } else {
      setPinError(true);
      setPinInput('');
      toast.error('Yanlış PIN');
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pinInput.length >= 4) {
      handlePinSubmit();
    }
  };

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { isCacheFresh } = await import('@/components/DataPreloader');

    if (activeTab === 'cards') {
      // Check cache first
      const cachedCards = getCardsCache(user.id);
      if (cachedCards && cachedCards.length > 0) {
        setCards(cachedCards);
        setIsLoading(false);

        // Only fetch in background if cache is stale
        if (isCacheFresh('cards', user.id)) {
          console.log("💳 Using fresh cache for cards");
          return;
        }
      }
      const { data: cardsData } = await supabase.from('cards').select('*').order('created_at', { ascending: false });
      if (cardsData) setCards(cardsData);
      setIsLoading(false);
    } else if (activeTab === 'ibans') {
      // Check cache first
      const cachedIbans = getIbansCache(user.id);
      if (cachedIbans && cachedIbans.length > 0) {
        setIbans(cachedIbans);
        setIsLoading(false);

        // Only fetch in background if cache is stale
        if (isCacheFresh('ibans', user.id)) {
          console.log("🏦 Using fresh cache for IBANs");
          return;
        }
      }
      const { data: ibansData } = await supabase.from('ibans').select('*').order('created_at', { ascending: false });
      if (ibansData) setIbans(ibansData);
      setIsLoading(false);
    } else if (activeTab === 'accounts') {
      // Check cache first
      const { getAccountsCache } = await import('@/components/DataPreloader');
      const cachedAccounts = getAccountsCache(user.id);
      if (cachedAccounts && cachedAccounts.length > 0) {
        setAccounts(cachedAccounts);
        setIsLoading(false);

        // Only fetch in background if cache is stale
        if (isCacheFresh('accounts', user.id)) {
          console.log("🔐 Using fresh cache for accounts");
          return;
        }
      }

      const { data: accountsData } = await supabase.from('accounts').select('*');
      if (accountsData) setAccounts(accountsData);
      setIsLoading(false);
    }
  }, [activeTab, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCards = useMemo(() => {
    if (!normalizedQuery) return cards;
    return cards.filter((card) => {
      const label = (card.label ?? '').toLowerCase();
      const holder = (card.holder_name_enc ?? '').toLowerCase();
      const lastFour = (card.last_four ?? '').toString();
      return (
        label.includes(normalizedQuery) ||
        holder.includes(normalizedQuery) ||
        lastFour.includes(normalizedQuery)
      );
    });
  }, [cards, normalizedQuery]);

  const filteredIbans = useMemo(() => {
    if (!normalizedQuery) return ibans;
    return ibans.filter((iban) => {
      const label = (iban.label ?? '').toLowerCase();
      const number = (iban.iban ?? '').toLowerCase();
      return label.includes(normalizedQuery) || number.includes(normalizedQuery);
    });
  }, [ibans, normalizedQuery]);

  const filteredAccounts = useMemo(() => {
    if (!normalizedQuery) return accounts;
    return accounts.filter((account) => {
      const service = (account.service_name ?? account.service ?? '').toLowerCase();
      const username = (account.username ?? account.username_enc ?? '').toLowerCase();
      return service.includes(normalizedQuery) || username.includes(normalizedQuery);
    });
  }, [accounts, normalizedQuery]);

  const getAddButtonText = () => {
    switch (activeTab) {
      case 'cards':
        return 'Yeni Kart Ekle';
      case 'ibans':
        return 'Yeni IBAN Ekle';
      case 'accounts':
        return 'Yeni Hesap Ekle';
      default:
        return 'Yeni Ekle';
    }
  };

  const handleAddNew = () => {
    if (activeTab === 'cards') {
      openAddCardModal();
    } else if (activeTab === 'ibans') {
      openAddIbanModal();
    } else if (activeTab === 'accounts' && accountsRef.current?.triggerCreate) {
      accountsRef.current.triggerCreate();
    }
  };

  // Show loading while checking PIN
  if (checkingPin) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Show PIN entry screen if required and not verified
  if (isPinRequired && !isPinVerified) {
    return (
      <div className="w-full h-full pt-6">
        <div className="w-full min-h-[750px] rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/20 light:bg-white/90 backdrop-blur-sm overflow-hidden light:shadow-xl flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm p-8"
          >
            {/* Lock Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-emerald-500" />
            </div>

            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Cüzdan Kilitli</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">Devam etmek için PIN'inizi girin</p>

            {/* PIN Input */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    pinError
                      ? 'border-red-500 bg-red-500/10'
                      : pinInput.length > index
                        ? 'border-emerald-500 bg-emerald-500/10 text-white dark:text-white light:text-zinc-900'
                        : 'border-zinc-300 dark:border-white/10 bg-zinc-100 dark:bg-white/5'
                  }`}
                >
                  {pinInput.length > index && '•'}
                </div>
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (pinInput.length < 6) {
                      const newPin = pinInput + num;
                      setPinInput(newPin);
                      setPinError(false);
                      if (newPin.length >= 4 && newPin === storedPin) {
                        setTimeout(() => {
                          setIsPinVerified(true);
                          sessionStorage.setItem('wallet_pin_verified', 'true');
                          toast.success('Cüzdan kilidi açıldı');
                        }, 100);
                      }
                    }
                  }}
                  className="h-14 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xl font-semibold transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <div /> {/* Empty space */}
              <button
                onClick={() => {
                  if (pinInput.length < 6) {
                    const newPin = pinInput + '0';
                    setPinInput(newPin);
                    setPinError(false);
                    if (newPin.length >= 4 && newPin === storedPin) {
                      setTimeout(() => {
                        setIsPinVerified(true);
                        sessionStorage.setItem('wallet_pin_verified', 'true');
                        toast.success('Cüzdan kilidi açıldı');
                      }, 100);
                    }
                  }
                }}
                className="h-14 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white text-xl font-semibold transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => setPinInput(pinInput.slice(0, -1))}
                className="h-14 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>

            {pinError && (
              <p className="text-red-500 text-sm mt-4">Yanlış PIN. Tekrar deneyin.</p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full pt-6">
      <div className={`w-full h-full transition-all duration-500 ease-in-out`}>
        <div className="w-full min-h-[750px] rounded-3xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/20 dark:bg-black/20 light:bg-white/90 backdrop-blur-sm overflow-hidden light:shadow-xl">
          <div className="p-8 space-y-6">
            {/* Header Section - Top Row */}
            <div className="relative flex items-center justify-center gap-4">
              {/* Title - Absolute Left */}
              <h1 className="absolute left-0 text-2xl font-bold text-white dark:text-white light:text-zinc-900">Cüzdanım</h1>

              {/* Search Bar - Kart veya IBAN'larda ara */}
              <div className="flex justify-center w-full max-w-md">
                <div className="relative w-full group">

                  {/* İKON (z-10 ile öne alındı) */}
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-focus-within:text-emerald-500 transition-colors duration-300"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>

                  {/* INPUT */}
                  <input
                    type="search"
                    placeholder="Kart veya IBAN'larda ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="
        w-full h-12 
        /* Light Mode: Açık gri zemin */
        bg-zinc-100 hover:bg-zinc-200/50
        /* Dark Mode: Şeffaf koyu zemin */
        dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60
        
        backdrop-blur-xl 
        border border-transparent dark:border-white/10 
        
        /* Focus Efektleri */
        focus:bg-white dark:focus:bg-zinc-900/80
        focus:border-emerald-500/30
        focus:ring-4 focus:ring-emerald-500/10 
        
        rounded-2xl 
        pl-11 pr-4 
        
        text-sm text-zinc-800 dark:text-zinc-200 
        placeholder:text-zinc-400 dark:placeholder:text-zinc-500
        
        transition-all duration-300 ease-out
        outline-none 
        shadow-sm hover:shadow-md
      "
                  />
                </div>
              </div>

              {/* Action Button - Absolute Right */}
              {currentView === 'create' ? (
                <button
                  onClick={() => {
                    if (activeTab === 'cards') useModalStore.getState().closeAddCardModal();
                    else if (activeTab === 'ibans') useModalStore.getState().closeAddIbanModal();
                    else if (activeTab === 'accounts') accountsRef.current?.triggerList();
                  }}
                  className="absolute right-0 bg-white/5 dark:bg-white/5 light:bg-zinc-100 text-white dark:text-white light:text-zinc-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200 border border-white/10 dark:border-white/10 light:border-zinc-300 hover:border-white/20 dark:hover:border-white/20 light:hover:border-zinc-400 transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Listeye Dön
                </button>
              ) : (
                <button
                  onClick={handleAddNew}
                  className="absolute right-0 bg-white dark:bg-white light:bg-zinc-900 text-black dark:text-black light:text-white hover:bg-zinc-200 dark:hover:bg-zinc-200 light:hover:bg-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {getAddButtonText()}
                </button>
              )}
            </div>

            {/* Tabs Row */}
            <div className="flex justify-center md:justify-start">
              <div className="bg-white/5 dark:bg-white/5 light:bg-zinc-100 border border-white/10 dark:border-white/10 light:border-zinc-200 rounded-full p-1 flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${activeTab === 'cards'
                    ? 'bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-900 text-white'
                    : 'text-white/70 dark:text-white/70 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200'
                    }`}
                >
                  Kartlar
                </button>
                <button
                  onClick={() => setActiveTab('ibans')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${activeTab === 'ibans'
                    ? 'bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-900 text-white'
                    : 'text-white/70 dark:text-white/70 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200'
                    }`}
                >
                  IBAN'lar
                </button>
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${activeTab === 'accounts'
                    ? 'bg-zinc-800 dark:bg-zinc-800 light:bg-zinc-900 text-white'
                    : 'text-white/70 dark:text-white/70 light:text-zinc-600 hover:text-white dark:hover:text-white light:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-zinc-200'
                    }`}
                >
                  Hesaplar
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'cards' && (
                <motion.div
                  key="cards"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardsPageManager ref={cardsRef} cards={filteredCards} onRefresh={refreshData} onViewChange={handleViewChange} />
                </motion.div>
              )}
              {activeTab === 'ibans' && (
                <motion.div
                  key="ibans"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <IbansPageManager ref={ibansRef} ibans={filteredIbans} onRefresh={refreshData} onViewChange={handleViewChange} />
                </motion.div>
              )}
              {activeTab === 'accounts' && (
                <motion.div
                  key="accounts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AccountsPageManager ref={accountsRef} accounts={filteredAccounts} onRefresh={refreshData} onViewChange={handleViewChange} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
