/**
 * Service icons and brand definitions using Brandfetch CDN
 */

export type BrandType = "brandfetch" | "text" | "svg-path";

export interface BrandInfo {
  id: string;
  name: string;
  type: BrandType;
  domain?: string; // Brandfetch domain (e.g., spotify.com)
  content?: string; // Fallback text content or SVG path
  viewBox?: string; // SVG viewBox for svg-path type
  colors: {
    primary: string;
    bg?: string;
  };
}

// --- TURKISH BANKS ---
const BANKS: Record<string, BrandInfo> = {
  garanti: {
    id: "garanti",
    name: "Garanti BBVA",
    type: "brandfetch",
    domain: "garantibbva.com.tr",
    colors: { primary: "#005F3F", bg: "#ffffff" }
  },
  ziraat: {
    id: "ziraat",
    name: "Ziraat Bankası",
    type: "brandfetch",
    domain: "ziraatbank.com.tr",
    colors: { primary: "#E3051B", bg: "#ffffff" }
  },
  akbank: {
    id: "akbank",
    name: "Akbank",
    type: "brandfetch",
    domain: "akbank.com",
    colors: { primary: "#DA291C", bg: "#ffffff" }
  },
  isbank: {
    id: "isbank",
    name: "İş Bankası",
    type: "svg-path",
    viewBox: "0 0 24 24",
    content: "M4 4h2v16H4V4zm4 0h2v16H8V4zm10 0h2v16h-2V4zm-6 0h4v2h-4V4zm0 7h4v2h-4v-2zm0 7h4v2h-4v-2z",
    colors: { primary: "#1F49B6", bg: "#ffffff" }
  },
  yapikredi: {
    id: "yapikredi",
    name: "Yapı Kredi",
    type: "brandfetch",
    domain: "yapikredi.com.tr",
    colors: { primary: "#184593", bg: "#ffffff" }
  },
  enpara: {
    id: "enpara",
    name: "Enpara.com",
    type: "brandfetch",
    domain: "enpara.com",
    colors: { primary: "#A65893", bg: "#ffffff" }
  },
  papara: {
    id: "papara",
    name: "Papara",
    type: "brandfetch",
    domain: "papara.com",
    colors: { primary: "#000000", bg: "#ffffff" }
  },
  qnb: {
    id: "qnb",
    name: "QNB Finansbank",
    type: "brandfetch",
    domain: "qnbfinansbank.com",
    colors: { primary: "#8B1D41", bg: "#ffffff" }
  },
  deniz: {
    id: "deniz",
    name: "DenizBank",
    type: "brandfetch",
    domain: "denizbank.com",
    colors: { primary: "#1E4692", bg: "#ffffff" }
  },
  halk: {
    id: "halk",
    name: "Halkbank",
    type: "brandfetch",
    domain: "halkbank.com.tr",
    colors: { primary: "#0093D0", bg: "#ffffff" }
  },
  vakif: {
    id: "vakif",
    name: "VakıfBank",
    type: "brandfetch",
    domain: "vakifbank.com.tr",
    colors: { primary: "#FCB515", bg: "#ffffff" }
  },
  teb: {
    id: "teb",
    name: "TEB",
    type: "brandfetch",
    domain: "teb.com.tr",
    colors: { primary: "#009639", bg: "#ffffff" }
  },
  ing: {
    id: "ing",
    name: "ING",
    type: "brandfetch",
    domain: "ing.com.tr",
    colors: { primary: "#FF6200", bg: "#ffffff" }
  }
};

// --- SUBSCRIPTION SERVICES ---
const SERVICES: Record<string, BrandInfo> = {
  spotify: {
    id: "spotify",
    name: "Spotify",
    type: "brandfetch",
    domain: "spotify.com",
    colors: { primary: "#1DB954", bg: "#000000" }
  },
  netflix: {
    id: "netflix",
    name: "Netflix",
    type: "brandfetch",
    domain: "netflix.com",
    colors: { primary: "#E50914", bg: "#000000" }
  },
  youtube: {
    id: "youtube",
    name: "YouTube",
    type: "brandfetch",
    domain: "youtube.com",
    colors: { primary: "#FF0000", bg: "#ffffff" }
  },
  discord: {
    id: "discord",
    name: "Discord",
    type: "brandfetch",
    domain: "discord.com",
    colors: { primary: "#5865F2", bg: "#ffffff" }
  },
  prime: {
    id: "prime",
    name: "Amazon Prime",
    type: "brandfetch",
    domain: "amazon.com", // amazon.com logosu daha iyi görünüyor
    colors: { primary: "#00A8E1", bg: "#ffffff" }
  },
  disney: {
    id: "disney",
    name: "Disney+",
    type: "brandfetch",
    domain: "disneyplus.com",
    colors: { primary: "#ffffff", bg: "#060420" }
  },
  apple: {
    id: "apple",
    name: "Apple",
    type: "brandfetch",
    domain: "apple.com",
    colors: { primary: "#000000", bg: "#ffffff" }
  },
  gain: {
    id: "gain",
    name: "Gain",
    type: "brandfetch",
    domain: "gain.tv",
    colors: { primary: "#FF0000", bg: "#ffffff" }
  },
  exxen: {
    id: "exxen",
    name: "Exxen",
    type: "brandfetch",
    domain: "exxen.com",
    colors: { primary: "#FBB03B", bg: "#ffffff" }
  },
  blutv: {
    id: "blutv",
    name: "BluTV",
    type: "brandfetch",
    domain: "blutv.com",
    colors: { primary: "#00AEEF", bg: "#ffffff" }
  },
  mubi: {
    id: "mubi",
    name: "Mubi",
    type: "brandfetch",
    domain: "mubi.com",
    colors: { primary: "#000000", bg: "#ffffff" }
  },
  tod: {
    id: "tod",
    name: "TOD",
    type: "brandfetch",
    domain: "todtv.com.tr",
    colors: { primary: "#390052", bg: "#ffffff" }
  },
  ssport: {
    id: "ssport",
    name: "S Sport+",
    type: "brandfetch",
    domain: "ssportplus.com",
    colors: { primary: "#00A3E0", bg: "#ffffff" }
  },
  github: {
    id: "github",
    name: "GitHub",
    type: "brandfetch",
    domain: "github.com",
    colors: { primary: "#181717", bg: "#ffffff" }
  },
  google: {
    id: "google",
    name: "Google",
    type: "brandfetch",
    domain: "google.com",
    colors: { primary: "#4285F4", bg: "#ffffff" }
  },
  icloud: {
    id: "icloud",
    name: "iCloud",
    type: "brandfetch",
    domain: "icloud.com",
    colors: { primary: "#3693F3", bg: "#ffffff" }
  },
  binance: {
    id: "binance",
    name: "Binance",
    type: "brandfetch",
    domain: "binance.com",
    colors: { primary: "#F3BA2F", bg: "#000000" }
  }
};

// Combine all
const ALL_BRANDS = { ...BANKS, ...SERVICES };

/**
 * Normalize query string
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace('bankası', '')
    .replace('bank', '')
    .replace('premium', '')
    .replace('music', '')
    .replace('plus', '')
    .replace('+', '')
    .replace('tr', ''); // garanti tr gibi durumlar için
}

/**
 * Get brand info by name
 */
export function getBrandInfo(query: string): BrandInfo | null {
  if (!query) return null;

  const key = normalize(query);

  // Direct key match check
  for (const [brandKey, brand] of Object.entries(ALL_BRANDS)) {
    if (key.includes(brandKey) || brandKey.includes(key)) {
      return brand;
    }
  }

  return null;
}

/**
 * Get specific type info if needed
 */
export function getBankInfo(query: string): BrandInfo | null {
  const key = normalize(query);
  for (const [brandKey, brand] of Object.entries(BANKS)) {
    if (key.includes(brandKey)) return brand;
  }
  return null;
}

export function getServiceInfo(query: string): BrandInfo | null {
  const key = normalize(query);
  for (const [brandKey, brand] of Object.entries(SERVICES)) {
    if (key.includes(brandKey)) return brand;
  }
  return null;
}

/**
 * Get list of all available service names
 */
export function getAllServiceNames(): string[] {
  return Object.values(SERVICES).map(s => s.name).sort();
}
