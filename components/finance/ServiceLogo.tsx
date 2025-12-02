"use client";

import { BrandInfo } from "@/lib/serviceIcons";
import Image from "next/image";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface ServiceLogoProps {
  brand: BrandInfo | null;
  fallbackText: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function ServiceLogo({ brand, fallbackText, size = "md", className = "" }: ServiceLogoProps) {
  const [imgError, setImgError] = useState(false);
  const { theme } = useTheme();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-xl"
  };

  const renderFallback = () => (
    <div 
      className={`rounded-xl flex items-center justify-center font-bold tracking-wider border ${sizeClasses[size]} ${className}`}
      style={{ 
        backgroundColor: brand?.colors?.bg || '#f4f4f5',
        color: brand?.colors?.primary || '#71717a',
        borderColor: 'rgba(0,0,0,0.05)'
      }}
    >
      {(fallbackText || "?").slice(0, 2).toUpperCase()}
    </div>
  );

  if (!brand) {
    return renderFallback();
  }

  // Discord mark should flip color with theme (black on light, white on dark)
  if (brand.id === "discord") {
    // Note: Brandfetch link order is intentionally inverted so dark mode shows the lighter mark.
    const discordForLightMode = "https://cdn.brandfetch.io/idM8Hlme1a/idZ9ykLN4b.svg?c=1bxid64Mup7aczewSAYMX&t=1646262546276";
    const discordForDarkMode = "https://cdn.brandfetch.io/idM8Hlme1a/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1668075053047";

    if (!imgError) {
      return (
        <div className={`rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 shadow-sm p-1.5 relative overflow-hidden border border-zinc-100 dark:border-white/10 ${sizeClasses[size]} ${className}`}>
          <div className="relative w-full h-full">
              <Image
                src={theme === "dark" ? discordForDarkMode : discordForLightMode}
                alt={brand.name}
                fill
                className="object-contain"
                onError={() => setImgError(true)}
                unoptimized
              />
          </div>
        </div>
      );
    }

    return renderFallback();
  }

  // Binance has custom assets for light/dark
  if (brand.id === "binance") {
    const binanceDarkMode = "https://cdn.brandfetch.io/id-pjrLx_q/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1675846248522";
    const binanceLightMode = "https://cdn.brandfetch.io/id-pjrLx_q/theme/dark/idtm0kR5Wk.svg?c=1bxid64Mup7aczewSAYMX&t=1675846247575";

    if (!imgError) {
      return (
        <div className={`rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 shadow-sm p-1.5 relative overflow-hidden border border-zinc-100 dark:border-white/10 ${sizeClasses[size]} ${className}`}>
          <div className="relative w-full h-full">
              <Image
                src={theme === "dark" ? binanceDarkMode : binanceLightMode}
                alt={brand.name}
                fill
                className="object-contain"
                onError={() => setImgError(true)}
                unoptimized
              />
          </div>
        </div>
      );
    }

    return renderFallback();
  }

  // --- BRANDFETCH CDN RENDER ---
  if (brand.type === "brandfetch" && brand.domain && !imgError) {
    // Brandfetch CDN URL
    // c=1idHS4FIS8wG7IAYxk8 parametresi public bir client ID gibi davranır, dokümantasyondaki örnekten alındı.
    const logoUrl = `https://cdn.brandfetch.io/${brand.domain}?c=1idHS4FIS8wG7IAYxk8`;

    return (
      <div className={`rounded-xl flex items-center justify-center bg-white shadow-sm p-1.5 relative overflow-hidden border border-zinc-100 dark:border-white/10 ${sizeClasses[size]} ${className}`}>
        <div className="relative w-full h-full">
            <Image
              src={logoUrl}
              alt={brand.name}
              fill
              className="object-contain"
              onError={() => setImgError(true)}
              unoptimized // External URL optimization skip
            />
        </div>
      </div>
    );
  }

  return renderFallback();
}
