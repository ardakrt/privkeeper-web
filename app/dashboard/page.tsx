"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  CreditCard,
  Loader2,
  CloudSun,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Cloud,
  MapPin,
  Search,
  X,
  Wind,
  CalendarDays,
  Droplets,
  CloudDrizzle,
  CloudFog,
  Copy,
  Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getServiceInfo } from "@/lib/serviceIcons";
import ServiceLogo from "@/components/finance/ServiceLogo";
import * as OTPAuth from "otpauth";
import { revealOTPSecret } from "@/app/actions";
import { getOTPSecretsCache } from "@/components/OTPPreloader";

// --- Helper Functions ---

const getWeatherIcon = (code: number, className: string) => {
  // Animasyonlu İkonlar
  if (code === 0) return <Sun className={`${className} text-yellow-500 dark:text-yellow-400 animate-[spin_12s_linear_infinite]`} />;
  if (code >= 1 && code <= 3) return <CloudSun className={`${className} text-blue-500 dark:text-blue-400`} />;
  if (code === 45 || code === 48) return <CloudFog className={`${className} text-gray-500 dark:text-gray-400`} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={`${className} text-blue-400 dark:text-blue-300`} />;
  if (code >= 61 && code <= 67) return <CloudRain className={`${className} text-blue-600 dark:text-blue-500`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-zinc-400 dark:text-white`} />;
  if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-700 dark:text-blue-600`} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={`${className} text-yellow-600 dark:text-yellow-500`} />;
  return <CloudSun className={className} />;
};

function generateOTPCode(secret: string): string {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    return totp.generate();
  } catch (error) {
    return "------";
  }
}

function getRemainingSeconds(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

function maskCardNumber(lastFour: string): string {
  if (!lastFour) return "•••• •••• •••• ••••";
  return `•••• •••• •••• ${lastFour}`;
}

function formatExpiryDate(expiry: string): string {
  if (!expiry) return "••/••";
  const cleaned = expiry.replace(/\D/g, "");
  if (cleaned.length >= 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return expiry;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState("");

  // Data States
  const [recentNote, setRecentNote] = useState<any>(null);
  const [totalSubscriptionCost, setTotalSubscriptionCost] = useState<number>(0);
  const [authenticatorCode, setAuthenticatorCode] = useState<any>(null);
  const [firstCard, setFirstCard] = useState<any>(null);

  // Auth States
  const [currentOTP, setCurrentOTP] = useState<string>("------");
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const [otpSecret, setOtpSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Weather States
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>("Ankara");
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [weatherLoading, setWeatherLoading] = useState(true);

  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createBrowserClient();

  // --- WEATHER FUNCTIONS (GÜNCELLENMİŞ) ---
  const fetchWeather = async (lat: number, lon: number, name: string) => {
    try {
      setWeatherLoading(true);
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await res.json();

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        wind: data.current.wind_speed_10m,
        code: data.current.weather_code
      });

      const daily = data.daily;
      const next5Days = [];
      for (let i = 1; i <= 5; i++) {
        const date = new Date(daily.time[i]);
        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'short' });
        next5Days.push({
          day: dayName,
          max: Math.round(daily.temperature_2m_max[i]),
          min: Math.round(daily.temperature_2m_min[i]),
          code: daily.weather_code[i]
        });
      }
      setForecast(next5Days);
      setLocationName(name);

      localStorage.setItem("keeper_weather_loc", JSON.stringify({ lat, lon, name }));
    } catch (error) {
      console.error("Hava durumu hatası:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  // --- AKILLI ARAMA FONKSİYONU ---
  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citySearch.trim()) return;

    try {
      setWeatherLoading(true);

      // 1. Deneme: Kullanıcının yazdığı metni aynen ara (örn: "Keçiören")
      let searchTerm = citySearch;
      let res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=tr&format=json`);
      let data = await res.json();

      // 2. Deneme: Eğer sonuç yoksa ve boşluk varsa, ilk kelimeyi dene (örn: "Keçiören Ankara" -> "Keçiören")
      if ((!data.results || data.results.length === 0) && searchTerm.includes(" ")) {
        const firstWord = searchTerm.split(" ")[0];
        console.log(`"${searchTerm}" bulunamadı, "${firstWord}" deneniyor...`);
        res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(firstWord)}&count=5&language=tr&format=json`);
        data = await res.json();
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const { latitude, longitude, name, admin1, country } = result;

        // Ekranda görünecek isim formatı: "İlçe, Şehir" veya "Şehir, Ülke"
        let displayName = name;
        if (admin1 && admin1 !== name) {
          displayName = `${name}, ${admin1}`; // Örn: Keçiören, Ankara
        } else if (country) {
          displayName = `${name}, ${country}`; // Örn: Ankara, Türkiye
        }

        await fetchWeather(latitude, longitude, displayName);
        setIsWeatherModalOpen(false);
        setCitySearch("");
      } else {
        alert(`"${citySearch}" bulunamadı. Lütfen sadece ilçe adını yazmayı deneyin (Örn: Keçiören).`);
      }
    } catch (error) {
      console.error("Arama hatası:", error);
      alert("Bir bağlantı hatası oluştu.");
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: notes } = await supabase.from("notes").select("title, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (notes && notes.length > 0) setRecentNote(notes[0]);

      const { data: subscriptions } = await supabase.from("subscriptions").select("amount, billing_cycle, type").eq("user_id", user.id).eq("type", "subscription");
      if (subscriptions) {
        const monthlyTotal = subscriptions.reduce((acc: number, sub: any) => {
          let amount = sub.amount || 0;
          if (sub.billing_cycle === "yearly") amount /= 12;
          else if (sub.billing_cycle === "weekly") amount *= 4.33;
          else if (sub.billing_cycle === "daily") amount *= 30;
          return acc + amount;
        }, 0);
        setTotalSubscriptionCost(monthlyTotal);
      }

      const { data: otpCodes } = await supabase.from("otp_codes").select("*").order("order_index", { ascending: true }).limit(1);
      if (otpCodes && otpCodes.length > 0) {
        setAuthenticatorCode(otpCodes[0]);
        
        // Secret'ı çöz
        const code = otpCodes[0];
        const secretCache = getOTPSecretsCache();
        const cached = secretCache.get(code.bt_token_id_secret);
        
        if (cached) {
          setOtpSecret(cached);
        } else if (code.bt_token_id_secret) {
          try {
            const secret = await revealOTPSecret(code.bt_token_id_secret);
            secretCache.set(code.bt_token_id_secret, secret);
            setOtpSecret(secret);
          } catch (error) {
            console.error("OTP secret çözülemedi:", error);
          }
        }
      }

      const { data: cardsData } = await supabase.from("cards").select("*").order("created_at", { ascending: false }).limit(1);
      if (cardsData && cardsData.length > 0) setFirstCard(cardsData[0]);

      const savedLoc = localStorage.getItem("keeper_weather_loc");
      if (savedLoc) {
        const { lat, lon, name } = JSON.parse(savedLoc);
        fetchWeather(lat, lon, name);
      } else {
        fetchWeather(39.93, 32.85, "Ankara");
      }

      setLoading(false);
    };

    fetchData();

    const hour = new Date().getHours();
    if (hour < 6) setGreeting("İyi Geceler");
    else if (hour < 12) setGreeting("Günaydın");
    else if (hour < 18) setGreeting("Tünaydın");
    else setGreeting("İyi Akşamlar");
  }, [router, supabase]);

  useEffect(() => {
    if (!otpSecret) return;
    const updateOTP = () => {
      const code = generateOTPCode(otpSecret);
      setCurrentOTP(`${code.slice(0, 3)} ${code.slice(3)}`);
      setRemainingTime(getRemainingSeconds());
    };
    updateOTP();
    const interval = setInterval(updateOTP, 1000);
    return () => clearInterval(interval);
  }, [otpSecret]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const userName = user?.user_metadata?.name || "Arda";

  // Rastgele hoş mesajlar
  const greetingMessages = [
    "Dijital yaşamın bugün çok sakin.",
    "Bugün harika şeyler başarabilirsin!",
    "Her şey yolunda görünüyor.",
    "Yeni bir gün, yeni fırsatlar.",
    "Kendine bir kahve al, hak ettin.",
    "Bugün için planların hazır mı?",
    "Mükemmel bir gün olacak!",
    "Küçük adımlar, büyük başarılar.",
    "Bugün ne öğreneceksin?",
    "Her an yeni bir başlangıç.",
    "Enerjin yerinde görünüyor!",
    "Hayal et, planla, başar.",
    "Bugün senin günün!",
    "Bir gülümseme her şeyi değiştirir.",
    "Hedeflerine bir adım daha yaklaştın.",
    "Bugün için minnettar ol.",
    "Yaratıcılığını konuştur!",
    "Odaklan ve parla.",
    "Bugün sürprizlerle dolu olabilir.",
    "Kendine inan, yapabilirsin!"
  ];

  // Güne göre sabit mesaj seç (her gün farklı ama gün içinde aynı)
  const dailyMessage = greetingMessages[new Date().getDate() % greetingMessages.length];

  // OTP Kopyalama
  const handleCopyOTP = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const code = currentOTP.replace(" ", "");
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kod kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Hava durumuna göre arka plan gradient
  const getWeatherGradient = () => {
    if (!weather) return "from-zinc-500/10 via-transparent to-zinc-500/5";
    const code = weather.code;
    // Güneşli
    if (code === 0) return "from-yellow-500/20 via-orange-500/10 to-amber-500/5";
    // Parçalı bulutlu
    if (code >= 1 && code <= 3) return "from-blue-400/15 via-sky-500/10 to-cyan-500/5";
    // Sisli
    if (code === 45 || code === 48) return "from-gray-400/20 via-slate-500/10 to-zinc-500/5";
    // Çiseleyen
    if (code >= 51 && code <= 57) return "from-blue-500/15 via-cyan-500/10 to-teal-500/5";
    // Yağmurlu
    if (code >= 61 && code <= 67) return "from-blue-600/20 via-indigo-500/10 to-blue-500/5";
    // Karlı
    if (code >= 71 && code <= 77) return "from-slate-300/20 via-zinc-400/10 to-gray-500/5";
    // Sağanak
    if (code >= 80 && code <= 82) return "from-indigo-600/20 via-blue-600/10 to-cyan-600/5";
    // Fırtınalı
    if (code >= 95 && code <= 99) return "from-purple-600/20 via-indigo-600/10 to-violet-600/5";
    return "from-blue-500/10 via-transparent to-emerald-500/5";
  };

  return (
    <div className="w-full h-full flex items-center justify-center px-2 py-6 animate-fadeIn">
      {/* Ana Container - Border ile */}
      <div className="w-full max-w-[99%] h-[82vh] flex flex-col rounded-3xl backdrop-blur-xl border border-white/10 dark:border-white/10 light:border-zinc-200 bg-black/30 dark:bg-black/30 light:bg-white/80 light:shadow-2xl overflow-hidden">
        
        {/* İç Scroll Container */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {greeting}, <span className="text-emerald-600 dark:text-emerald-400">{userName}</span>
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">{dailyMessage}</p>
          </div>

          {/* BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">

        {/* --- WIDGET: SÜPER HAVA DURUMU (GÜNCELLENMİŞ) --- */}
        <div
          onClick={() => setIsWeatherModalOpen(true)}
          className="group lg:col-span-2 cursor-pointer relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.08] backdrop-blur-2xl flex flex-col justify-between shadow-xl hover:shadow-2xl hover:border-zinc-300 dark:hover:border-white/[0.15] transition-all duration-500 h-[200px]"
        >
          {/* Animasyonlu Hava Durumu Arka Planı */}
          <div className={`absolute inset-0 bg-gradient-to-br ${getWeatherGradient()} transition-all duration-1000`}></div>
          
          {/* Işık Efekti */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 dark:bg-white/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          {/* Güneş/Bulut Animasyonu */}
          {weather?.code === 0 && (
            <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-yellow-400/30 to-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
          )}
          {weather?.code >= 61 && weather?.code <= 82 && (
            <>
              <div className="absolute top-8 left-1/4 w-1 h-8 bg-blue-400/40 rounded-full animate-[rain_1s_ease-in-out_infinite]" style={{animationDelay: '0s'}}></div>
              <div className="absolute top-12 left-1/3 w-1 h-6 bg-blue-400/30 rounded-full animate-[rain_1s_ease-in-out_infinite]" style={{animationDelay: '0.2s'}}></div>
              <div className="absolute top-6 left-1/2 w-1 h-10 bg-blue-400/40 rounded-full animate-[rain_1s_ease-in-out_infinite]" style={{animationDelay: '0.4s'}}></div>
            </>
          )}

          {/* 1. KATMAN: ANLIK DURUM */}
          <div className="relative z-10 p-8 h-full flex flex-col justify-between transition-all duration-500 group-hover:translate-y-[-15px] group-hover:scale-95 group-hover:opacity-20 group-hover:blur-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-sm font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                  {locationName}
                </div>
                <div className="mt-4 animate-[fadeInUp_0.5s_ease-out]">
                  <span className="text-7xl font-bold text-zinc-900 dark:text-white tracking-tighter drop-shadow-2xl">
                    {weather ? weather.temp : "--"}°
                  </span>
                </div>
              </div>

              {/* Büyük İkon (Giriş Animasyonlu) */}
              <div className="relative w-20 h-20 flex items-center justify-center animate-in zoom-in duration-700">
                {weather ? (
                  weather.code === 0 ? (
                    <Sun className="w-16 h-16 text-yellow-500 dark:text-yellow-400 animate-[spin_12s_linear_infinite] drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]" strokeWidth={1.5} />
                  ) : (
                    <div className="relative">
                      <Cloud className="w-16 h-16 text-zinc-400 dark:text-white/90 drop-shadow-lg dark:fill-white/5" strokeWidth={1.5} />
                      {(weather.code >= 51) && <Droplets className="w-6 h-6 text-blue-500 dark:text-blue-400 absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce" />}
                    </div>
                  )
                ) : <Loader2 className="w-10 h-10 animate-spin text-zinc-400 dark:text-white" />}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2 backdrop-blur-md">
                <Wind className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {weather ? weather.wind : "-"} km/s
              </div>
              <div className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2 backdrop-blur-md">
                <Droplets className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                %{weather ? weather.humidity : "-"}
              </div>
            </div>
          </div>

          {/* 2. KATMAN: 5 GÜNLÜK TAHMİN */}
          <div className="absolute inset-0 bg-white/95 dark:bg-black/80 backdrop-blur-xl border-t border-zinc-200 dark:border-white/10 p-6 flex flex-col justify-center opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-20">
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4 px-2">
              <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> 5 Günlük Tahmin</span>
            </div>

            <div className="grid grid-cols-5 gap-3 h-full px-1">
              {forecast.map((day, index) => (
                <div key={index} className="flex flex-col items-center justify-between group/day">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">{day.day}</span>

                  <div className="my-1 transform group-hover/day:scale-110 transition-transform duration-300">
                    {getWeatherIcon(day.code, "w-5 h-5")}
                  </div>

                  <div className="w-full flex flex-col items-center gap-1 h-16 justify-end">
                    {/* Sıcaklık Barı - Daha Canlı */}
                    <div className="relative w-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden h-full">
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 via-emerald-400 to-yellow-300 rounded-full"
                        style={{ height: `${Math.min(((day.max) / 35) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col items-center -gap-1">
                      <span className="text-[10px] font-bold text-zinc-900 dark:text-white">{day.max}°</span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-500">{day.min}°</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WIDGET: HIZLI NOT */}
        <Link href="/dashboard/notes" className="group lg:col-span-2 bg-white/70 dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-emerald-500/30 rounded-[2rem] p-8 flex flex-col justify-between relative transition-all duration-500 overflow-hidden backdrop-blur-2xl h-[200px] shadow-xl hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-3 max-w-[85%]">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {recentNote ? recentNote.title : "Hızlı Not"}
                {!recentNote && <span className="text-xs font-normal text-zinc-600 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">Boş</span>}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-2">
                {recentNote ? recentNote.content : "Henüz bir notun yok. Buraya tıklayarak ilk notunu oluştur."}
              </p>
              {recentNote && (
                <span className="text-xs text-zinc-500 dark:text-zinc-600 block pt-2">
                  {new Date(recentNote.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
              <Plus className="w-6 h-6 text-white dark:text-black" strokeWidth={3} />
            </div>
          </div>
        </Link>

        {/* 2. SIRA: CÜZDAN, ABONELİK, AUTH */}
        <div className="group lg:col-span-2 relative h-full min-h-[240px] [perspective:1000px]">
          <Link href="/dashboard/wallet" className="block w-full h-full">
            <div className="relative w-full h-full transition-transform duration-500 hover:scale-[1.02] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]">
              {firstCard ? (
                <div className="absolute inset-0 w-full h-full rounded-[1.5rem] p-8 flex flex-col justify-between overflow-hidden border border-zinc-200 dark:border-white/10 bg-gradient-to-br from-white to-zinc-100 dark:from-black/40 dark:to-black/40 backdrop-blur-xl transition-all duration-500">
                  {/* Ambient Glow */}
                  <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                  
                  {/* Texture / Noise */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.15] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                  {/* Top Row: Chip & Contactless */}
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-b from-[#e2c56b] to-[#bfa148] relative overflow-hidden shadow-sm border border-[#967d34]/50">
                      <div className="absolute inset-0 opacity-50 bg-[repeating-linear-gradient(90deg,transparent,transparent_1px,#000_1px,#000_2px)] mix-blend-overlay"></div>
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20"></div>
                      <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-black/10 rounded-sm"></div>
                    </div>
                    <svg className="w-7 h-7 text-zinc-400 dark:text-white/60 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 5-5v10zm6 0l-5-5 5-5v10z" />
                    </svg>
                  </div>

                  {/* Card Number */}
                  <div className="relative z-10 mt-6">
                    <p className="text-2xl md:text-3xl font-mono text-zinc-800 dark:text-zinc-100 tracking-widest drop-shadow-sm" style={{ textShadow: "0px 1px 0px rgba(255,255,255,0.5)" }}>
                      {maskCardNumber(firstCard.last_four)}
                    </p>
                  </div>

                  {/* Bottom Details */}
                  <div className="relative z-10 flex justify-between items-end mt-auto">
                    <div>
                      <p className="text-[0.6rem] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1 font-medium">KART SAHİBİ</p>
                      <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-200 font-medium tracking-wide uppercase">
                        {firstCard.holder_name_enc?.toUpperCase() || userName.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[0.55rem] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5">SKT</p>
                        <p className="text-sm font-mono text-zinc-700 dark:text-zinc-200">
                          {firstCard.expiry_enc ? formatExpiryDate(firstCard.expiry_enc) : "••/••"}
                        </p>
                      </div>
                      <div className="relative w-10 h-6 opacity-80">
                        <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-zinc-400/30 dark:bg-white/30 backdrop-blur-sm border border-white/20 dark:border-white/10"></div>
                        <div className="absolute right-0 top-0 w-6 h-6 rounded-full bg-zinc-400/30 dark:bg-white/30 backdrop-blur-sm border border-white/20 dark:border-white/10"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full rounded-[1.5rem] p-8 flex flex-col items-center justify-center overflow-hidden bg-white/70 dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.08] hover:border-emerald-500/40 dark:hover:border-emerald-500/30 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-500">
                  {/* Glow Effect on Hover */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:border-emerald-200 dark:group-hover:border-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                      <CreditCard className="w-8 h-8 text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Henüz kart eklenmedi</h3>
                      <p className="text-sm text-zinc-500 max-w-xs">İlk kartını eklemek için buraya tıkla</p>
                    </div>
                    <div className="mt-2 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                      <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>

        <Link href="/dashboard/subscriptions" className="group relative bg-white/70 dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.08] hover:border-orange-500/40 dark:hover:border-orange-500/30 rounded-[2rem] p-8 flex flex-col justify-center transition-all duration-500 min-h-[180px] backdrop-blur-2xl shadow-xl hover:shadow-2xl overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <h3 className="text-zinc-600 dark:text-zinc-400 font-medium mb-1 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors relative z-10">Abonelikler</h3>
          <div className="flex items-baseline gap-1 relative z-10">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white group-hover:scale-105 transition-transform origin-left">
              ₺{totalSubscriptionCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 relative z-10">aylık toplam</span>
        </Link>

        <div className="group relative bg-white/70 dark:bg-white/[0.03] border border-zinc-200/50 dark:border-white/[0.08] hover:border-blue-500/40 dark:hover:border-blue-500/30 rounded-[2rem] p-6 flex flex-col justify-center transition-all duration-500 min-h-[180px] backdrop-blur-2xl shadow-xl hover:shadow-2xl overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <Link href="/dashboard/authenticator" className="absolute inset-0 z-0" />
          
          {authenticatorCode ? (
            <>
              {/* Header with Logo */}
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const brandInfo = getServiceInfo(authenticatorCode.service_name || authenticatorCode.issuer || "");
                    if (brandInfo) {
                      return <ServiceLogo brand={brandInfo} fallbackText={authenticatorCode.service_name || "?"} size="sm" />;
                    }
                    return (
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-500">{(authenticatorCode.service_name || authenticatorCode.issuer || "?").slice(0, 2).toUpperCase()}</span>
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{authenticatorCode.service_name || authenticatorCode.issuer || "Account"}</h3>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500">{authenticatorCode.account_name || "2FA Kodu"}</p>
                  </div>
                </div>
                
                {/* Copy Button */}
                <button
                  onClick={handleCopyOTP}
                  className="relative z-20 p-2 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all active:scale-95"
                  title="Kodu kopyala"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  )}
                </button>
              </div>
              
              {/* OTP Code */}
              <div className="text-3xl font-mono font-bold text-zinc-900 dark:text-white tracking-[0.25em] mb-3 group-hover:scale-105 transition-transform origin-left relative z-10">
                {currentOTP}
              </div>
              
              {/* Progress */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${remainingTime <= 5 ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${(remainingTime / 30) * 100}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-mono font-bold ${remainingTime <= 5 ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {remainingTime}s
                </span>
              </div>
            </>
          ) : (
            <Link href="/dashboard/authenticator" className="flex flex-col items-center justify-center py-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-sm text-zinc-500 text-center">2FA kodu ekle</p>
            </Link>
          )}
        </div>

          </div>
        </div>
      </div>

      {/* --- WEATHER SETTINGS MODAL --- */}
      {isWeatherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button
              onClick={() => setIsWeatherModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Konum Ayarları</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">İlçe veya şehir adı girin (örn: Çankaya)</p>

            <form onSubmit={handleCitySearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Örn: Kadıköy, Bornova..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={weatherLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white dark:text-black font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {weatherLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Konumu Güncelle"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}