"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if there's a hash fragment with access_token (magic link redirect)
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        // Parse the hash fragment
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        
        if (accessToken && refreshToken) {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            // Clear the hash from URL and redirect to dashboard
            window.history.replaceState(null, "", window.location.pathname);
            router.replace("/dashboard");
            return;
          } else {
            console.error("Error setting session:", error);
          }
        }
      }

      // Check if user is already logged in
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.replace("/dashboard");
        return;
      }

      // Not logged in and no token in URL, redirect to login
      router.replace("/login");
    };

    handleAuthRedirect();
  }, [router]);

  // Show loading state while processing
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500"></div>
        <p className="text-sm text-zinc-500">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}
