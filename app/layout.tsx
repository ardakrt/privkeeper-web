import type { Metadata } from "next";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccentColorProvider } from "@/contexts/AccentColorContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Keeper",
  description: "Keeper",
  icons: {
    icon: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let themeClass: "light" | "dark" = "dark";
  if (user) {
    const { data: pref } = await supabase
      .from("user_preferences")
      .select("theme_mode_web, accent_color")
      .eq("user_id", user.id)
      .single();
    const themeMode = (pref as any)?.theme_mode_web as string | undefined;
    if (themeMode === "dark") themeClass = "dark";
    else themeClass = "light";
  }
  let accentColor = "#3b82f6";
  if (user) {
    const { data: pref2 } = await supabase
      .from("user_preferences")
      .select("accent_color")
      .eq("user_id", user.id)
      .single();
    accentColor = ((pref2 as any)?.accent_color as string) || "#3b82f6";
  }
  return (
    <html lang="en" className={`${themeClass} h-[100dvh]`} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-[100dvh] overflow-hidden`}
        style={{ "--accent-color": accentColor } as React.CSSProperties}
      >
        <ThemeProvider>
          <AccentColorProvider>
            <NavigationProvider>
              <div className="flex h-full flex-col overflow-hidden">
                {children}
              </div>
            </NavigationProvider>
          </AccentColorProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
