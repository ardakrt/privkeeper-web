
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Flag, Timer, Watch, ChevronDown, Bell, Trash2, History, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Yardımcı fonksiyon: Süreyi biçimlendir (MM:SS.ms veya HH:MM:SS)
const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

// Geri sayım için basit format (HH:MM:SS)
const formatCountdown = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// UUID Generator Fallback
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

type HistoryItem = {
    id: string;
    type: 'stopwatch' | 'timer';
    duration: number; // ms for stopwatch, seconds for timer
    timestamp: number;
};

export default function TimerPage() {
    const [mode, setMode] = useState<'stopwatch' | 'timer'>('stopwatch');
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('action') === 'new-timer') {
            setMode('timer');
        }
    }, [searchParams]);

    // --- KRONOMETRE STATE ---
    const [swTime, setSwTime] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const swIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const swStartTimeRef = useRef<number>(0);

    // --- GERİ SAYIM STATE ---
    const [timerDuration, setTimerDuration] = useState(5 * 60); // Varsayılan 5 dk (saniye cinsinden)
    const [timerLeft, setTimerLeft] = useState(5 * 60);
    const [timerRunning, setTimerRunning] = useState(false);
    const [isTimerDone, setIsTimerDone] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- GEÇMİŞ YÖNETİMİ ---
    const addToHistory = (type: 'stopwatch' | 'timer', duration: number) => {
        const newItem: HistoryItem = {
            id: generateUUID(),
            type,
            duration,
            timestamp: Date.now(),
        };
        setHistory((prev) => [newItem, ...prev]);
    };

    const deleteHistoryItem = (id: string) => {
        setHistory((prev) => prev.filter((item) => item.id !== id));
    };

    const clearHistory = () => {
        setHistory([]);
    };

    // --- KRONOMETRE MANTIĞI ---
    useEffect(() => {
        if (swRunning) {
            swStartTimeRef.current = Date.now() - swTime;
            swIntervalRef.current = setInterval(() => {
                setSwTime(Date.now() - swStartTimeRef.current);
            }, 10);
        } else {
            if (swIntervalRef.current) clearInterval(swIntervalRef.current);
        }
        return () => {
            if (swIntervalRef.current) clearInterval(swIntervalRef.current);
        };
    }, [swRunning]);

    const handleSwStartPause = () => {
        setSwRunning(!swRunning);
    };

    const handleSwReset = () => {
        if (swTime > 0) {
            addToHistory('stopwatch', swTime);
        }
        setSwRunning(false);
        setSwTime(0);
        setLaps([]);
    };

    const handleSwLap = () => {
        setLaps((prev) => [swTime, ...prev]);
    };

    // --- GERİ SAYIM MANTIĞI ---
    useEffect(() => {
        if (timerRunning && timerLeft > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerLeft((prev) => {
                    if (prev <= 1) {
                        setTimerRunning(false);
                        setIsTimerDone(true);
                        addToHistory('timer', timerDuration); // Süre bittiğinde geçmişe ekle
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerRunning, timerLeft, timerDuration]);

    const handleTimerStartPause = () => {
        if (timerLeft === 0) {
            setTimerLeft(timerDuration);
            setIsTimerDone(false);
        }
        setTimerRunning(!timerRunning);
    };

    const handleTimerReset = () => {
        setTimerRunning(false);
        setTimerLeft(timerDuration);
        setIsTimerDone(false);
    };

    const setPresetTimer = (minutes: number) => {
        const seconds = minutes * 60;
        setTimerDuration(seconds);
        setTimerLeft(seconds);
        setTimerRunning(false);
        setIsTimerDone(false);
    };

    const adjustTimer = (amount: number) => {
        setTimerLeft(prev => Math.max(0, prev + amount));
    }

    return (
        <main className="w-full h-full bg-transparent">
            <div className="w-full h-full px-4 pt-4 pb-20 sm:px-8 sm:pt-6 sm:pb-16">

                {/* Ana Kapsayıcı - Grid Layout */}
                <div className="w-full min-h-[600px] lg:min-h-[750px] light:bg-white/80 dark:bg-black/20 backdrop-blur-sm light:border-zinc-200 dark:border-white/10 border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-3 relative flex flex-col lg:grid">

                    {/* SOL TARAF: Kontroller ve Saat (2/3 Genişlik) */}
                    <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r light:border-zinc-200 dark:border-white/10 order-1">
                        {/* Header Kısmı */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 lg:p-8 light:border-b light:border-zinc-200 dark:border-b dark:border-white/5">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold light:text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-3">
                                {mode === 'stopwatch' ? <Watch className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" /> : <Timer className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500" />}
                                {mode === 'stopwatch' ? 'Kronometre' : 'Geri Sayım'}
                            </h1>

                            {/* Mod Seçici */}
                            <div className="w-full sm:w-auto light:bg-zinc-100 dark:bg-white/5 backdrop-blur-md light:border-zinc-200 dark:border-white/10 border p-1 rounded-xl sm:rounded-2xl flex gap-1">
                                <button
                                    onClick={() => setMode('stopwatch')}
                                    className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${mode === 'stopwatch'
                                        ? 'light:bg-white dark:bg-zinc-800 light:text-zinc-900 dark:text-white shadow-lg'
                                        : 'light:text-zinc-600 dark:text-zinc-400 light:hover:text-zinc-900 dark:hover:text-white light:hover:bg-zinc-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Watch size={14} />
                                    <span>Kronometre</span>
                                </button>
                                <button
                                    onClick={() => setMode('timer')}
                                    className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${mode === 'timer'
                                        ? 'light:bg-white dark:bg-zinc-800 light:text-zinc-900 dark:text-white shadow-lg'
                                        : 'light:text-zinc-600 dark:text-zinc-400 light:hover:text-zinc-900 dark:hover:text-white light:hover:bg-zinc-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Timer size={14} />
                                    <span>Geri Sayım</span>
                                </button>
                            </div>
                        </div>

                        {/* İçerik Alanı */}
                        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 w-full relative min-h-[400px]">
                            <AnimatePresence mode="wait">
                                {mode === 'stopwatch' ? (
                                    <motion.div
                                        key="stopwatch"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col items-center w-full max-w-xl"
                                    >
                                        {/* Ana Zaman Göstergesi */}
                                        <div className="relative w-[70vw] h-[70vw] max-w-[260px] max-h-[260px] sm:max-w-[350px] sm:max-h-[350px] rounded-full border-4 light:border-zinc-200 dark:border-white/5 light:bg-zinc-50 dark:bg-black/20 backdrop-blur-xl flex items-center justify-center mb-6 sm:mb-8 shadow-2xl light:ring-1 light:ring-zinc-300 dark:ring-1 dark:ring-white/10">
                                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />

                                            <div className="text-center z-10">
                                                <span className="text-4xl sm:text-5xl lg:text-7xl font-bold light:text-zinc-900 dark:text-white tabular-nums tracking-tight block">
                                                    {formatTime(swTime).split('.')[0]}
                                                </span>
                                                <span className="text-xl sm:text-2xl lg:text-3xl font-medium text-zinc-500 tabular-nums">
                                                    .{formatTime(swTime).split('.')[1]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Kontroller */}
                                        <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                                            <button
                                                onClick={handleSwReset}
                                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full light:bg-zinc-100 dark:bg-zinc-800/50 light:border-zinc-200 dark:border-white/10 border flex items-center justify-center light:text-zinc-600 dark:text-zinc-400 light:hover:bg-zinc-200 dark:hover:bg-zinc-800 light:hover:text-zinc-900 dark:hover:text-white transition-all group"
                                                title="Sıfırla ve Kaydet"
                                            >
                                                <RotateCcw size={18} className="sm:w-5 sm:h-5 group-hover:-rotate-180 transition-transform duration-500" />
                                            </button>

                                            <button
                                                onClick={handleSwStartPause}
                                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${swRunning
                                                    ? 'light:bg-red-50 dark:bg-red-500/10 light:text-red-600 dark:text-red-500 border-2 light:border-red-200 dark:border-red-500/50 light:hover:bg-red-100 dark:hover:bg-red-500/20'
                                                    : 'light:bg-zinc-900 dark:bg-white light:text-white dark:text-black light:hover:bg-zinc-800 dark:hover:bg-zinc-200 border-2 border-transparent'
                                                    }`}
                                            >
                                                {swRunning ? <Pause size={28} className="sm:w-8 sm:h-8" fill="currentColor" /> : <Play size={28} className="sm:w-8 sm:h-8 ml-1" fill="currentColor" />}
                                            </button>

                                            <button
                                                onClick={handleSwLap}
                                                disabled={!swRunning}
                                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full light:bg-zinc-100 dark:bg-zinc-800/50 light:border-zinc-200 dark:border-white/10 border flex items-center justify-center light:text-zinc-600 dark:text-zinc-400 light:hover:bg-zinc-200 dark:hover:bg-zinc-800 light:hover:text-zinc-900 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Tur"
                                            >
                                                <Flag size={18} className="sm:w-5 sm:h-5" />
                                            </button>
                                        </div>

                                        {/* Tur Listesi (Sadece mevcut oturum) */}
                                        {laps.length > 0 && (
                                            <div className="w-full max-w-sm light:bg-zinc-50 dark:bg-white/5 light:border-zinc-200 dark:border-white/10 border rounded-xl overflow-hidden backdrop-blur-sm">
                                                <div className="max-h-[150px] overflow-y-auto scrollbar-thin light:scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                                                    <table className="w-full text-xs sm:text-sm">
                                                        <thead className="light:bg-zinc-100 dark:bg-white/5 light:text-zinc-600 dark:text-zinc-400 sticky top-0 backdrop-blur-md">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left font-medium">Tur</th>
                                                                <th className="px-4 py-2 text-right font-medium">Süre</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="light:divide-zinc-200 dark:divide-white/5 divide-y">
                                                            {laps.map((lapTime, index) => (
                                                                <tr key={index} className="light:text-zinc-700 dark:text-zinc-300">
                                                                    <td className="px-4 py-2">Tur {laps.length - index}</td>
                                                                    <td className="px-4 py-2 text-right font-mono">{formatTime(lapTime)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="timer"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex flex-col items-center w-full max-w-xl"
                                    >
                                        {/* Geri Sayım Göstergesi */}
                                        <div className={`relative w-[70vw] h-[70vw] max-w-[260px] max-h-[260px] sm:max-w-[350px] sm:max-h-[350px] rounded-full border-4 light:bg-zinc-50 dark:bg-black/20 backdrop-blur-xl flex items-center justify-center mb-6 sm:mb-8 shadow-2xl light:ring-1 light:ring-zinc-300 dark:ring-1 dark:ring-white/10 transition-colors duration-500 ${isTimerDone ? 'light:border-red-300 dark:border-red-500/50 light:shadow-red-300/20 dark:shadow-red-500/20' : 'light:border-zinc-200 dark:border-white/5'
                                            }`}>
                                            {isTimerDone && (
                                                <motion.div
                                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                    className="absolute inset-0 rounded-full light:bg-red-500/20 dark:bg-red-500/10"
                                                />
                                            )}

                                            <div className="text-center z-10 flex flex-col items-center w-full px-4">
                                                <span className={`text-5xl sm:text-6xl lg:text-8xl font-bold tabular-nums tracking-tight transition-colors ${isTimerDone ? 'light:text-red-600 dark:text-red-400' : 'light:text-zinc-900 dark:text-white'
                                                    }`}>
                                                    {formatCountdown(timerLeft)}
                                                </span>
                                                {isTimerDone && (
                                                    <span className="light:text-red-600 dark:text-red-400 font-medium mt-2 flex items-center gap-2 animate-pulse text-sm sm:text-base">
                                                        <Bell size={18} /> Süre Doldu!
                                                    </span>
                                                )}
                                                {!timerRunning && !isTimerDone && (
                                                    <div className="flex gap-4 mt-2 sm:mt-4">
                                                        <button onClick={() => adjustTimer(-60)} className="p-1 light:hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full light:text-zinc-600 dark:text-zinc-500 light:hover:text-zinc-900 dark:hover:text-white transition-colors"><ChevronDown size={20} /></button>
                                                        <span className="text-[10px] sm:text-xs light:text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-wider py-1">Dakika Ayarla</span>
                                                        <button onClick={() => adjustTimer(60)} className="p-1 light:hover:bg-zinc-100 dark:hover:bg-white/10 rounded-full light:text-zinc-600 dark:text-zinc-500 light:hover:text-zinc-900 dark:hover:text-white transition-colors rotate-180"><ChevronDown size={20} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Kontroller */}
                                        <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                                            <button
                                                onClick={handleTimerReset}
                                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full light:bg-zinc-100 dark:bg-zinc-800/50 light:border-zinc-200 dark:border-white/10 border flex items-center justify-center light:text-zinc-600 dark:text-zinc-400 light:hover:bg-zinc-200 dark:hover:bg-zinc-800 light:hover:text-zinc-900 dark:hover:text-white transition-all group"
                                                title="Sıfırla"
                                            >
                                                <RotateCcw size={18} className="sm:w-5 sm:h-5 group-hover:-rotate-180 transition-transform duration-500" />
                                            </button>

                                            <button
                                                onClick={handleTimerStartPause}
                                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${timerRunning
                                                    ? 'light:bg-amber-50 dark:bg-amber-500/10 light:text-amber-600 dark:text-amber-500 border-2 light:border-amber-200 dark:border-amber-500/50 light:hover:bg-amber-100 dark:hover:bg-amber-500/20'
                                                    : 'light:bg-zinc-900 dark:bg-white light:text-white dark:text-black light:hover:bg-zinc-800 dark:hover:bg-zinc-200 border-2 border-transparent'
                                                    }`}
                                            >
                                                {timerRunning ? <Pause size={28} className="sm:w-8 sm:h-8" fill="currentColor" /> : <Play size={28} className="sm:w-8 sm:h-8 ml-1" fill="currentColor" />}
                                            </button>

                                            <div className="w-12 h-12 sm:w-14 sm:h-14" /> {/* Spacer to balance layout */}
                                        </div>

                                        {/* Hızlı Ayarlar */}
                                        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-md px-2 sm:px-0">
                                            {[1, 5, 10, 15, 20, 30, 45, 60].map((min) => (
                                                <button
                                                    key={min}
                                                    onClick={() => setPresetTimer(min)}
                                                    className="light:bg-zinc-100 dark:bg-white/5 light:hover:bg-zinc-200 dark:hover:bg-white/10 light:border-zinc-200 dark:border-white/10 border rounded-lg sm:rounded-xl py-2 sm:py-3 text-xs sm:text-sm font-medium light:text-zinc-700 dark:text-zinc-300 light:hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95"
                                                >
                                                    {min} dk
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* SAĞ TARAF: Geçmiş Listesi (1/3 Genişlik) */}
                    <div className="hidden lg:flex light:bg-zinc-50 dark:bg-black/40 backdrop-blur-md light:border-l light:border-zinc-200 dark:border-l dark:border-white/10 flex-col lg:h-full max-h-[400px] lg:max-h-none border-t lg:border-t-0 light:border-zinc-200 dark:border-white/10 order-2">
                        <div className="p-4 sm:p-6 light:border-b light:border-zinc-200 dark:border-b dark:border-white/10 flex items-center justify-between light:bg-zinc-100 dark:bg-white/5 sticky top-0 z-20">
                            <h2 className="text-base sm:text-lg font-semibold light:text-zinc-900 dark:text-white flex items-center gap-2">
                                <History size={16} className="sm:w-[18px] sm:h-[18px] light:text-zinc-600 dark:text-zinc-400" />
                                Geçmiş
                            </h2>
                            {history.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="text-xs light:text-red-600 dark:text-red-400 light:hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                >
                                    Tümünü Temizle
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin light:scrollbar-thumb-zinc-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {history.length === 0 ? (
                                <div className="h-[150px] lg:h-full flex flex-col items-center justify-center light:text-zinc-400 dark:text-zinc-500 gap-3 opacity-60">
                                    <History size={24} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    <p className="text-sm font-medium">Henüz kayıt yok</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="group light:bg-white dark:bg-white/5 light:hover:bg-zinc-50 dark:hover:bg-white/10 light:border-zinc-200 dark:border-white/5 border rounded-xl p-3 sm:p-4 transition-all flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.type === 'stopwatch' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                                                    }`}>
                                                    {item.type === 'stopwatch' ? <Watch size={14} /> : <Timer size={14} />}
                                                </div>
                                                <div>
                                                    <p className="light:text-zinc-900 dark:text-white font-mono font-medium text-base sm:text-lg leading-none">
                                                        {item.type === 'stopwatch' ? formatTime(item.duration) : formatCountdown(item.duration)}
                                                    </p>
                                                    <p className="text-[10px] sm:text-xs light:text-zinc-500 dark:text-zinc-500 mt-1">
                                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteHistoryItem(item.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center light:text-zinc-500 dark:text-zinc-500 light:hover:text-red-600 dark:hover:text-red-400 light:hover:bg-red-50 dark:hover:bg-red-500/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
