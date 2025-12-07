import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Base response that will collect any cookie updates from Supabase
  const res = NextResponse.next();

  const supabase = createSupabaseMiddlewareClient(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Avoid redirect logic on non-GET requests (e.g., Server Actions POST) to prevent loops
  if (req.method !== "GET") {
    return res;
  }

  const isProtected = ["/dashboard", "/profile", "/settings"].some((p) =>
    pathname.startsWith(p)
  );
  
  // Allow update-pin and update-password flows to bypass device verification since they come from email
  if (pathname.startsWith("/auth/update-pin") || pathname.startsWith("/auth/update-password")) {
    return res;
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2FA Check: Stateless Cookie Existence Check (Performance Optimized)
  // We rely on Server Actions and RLS for actual data security.
  // Middleware just acts as a gatekeeper for the UI.
  const deviceToken = req.cookies.get("device_verified")?.value;
  const isDeviceVerified = !!deviceToken;

  if (session) {
    // If user is on Auth Page (Login/Register)
    if (isAuthPage) {
      // If device is verified, they don't need to be here -> Dashboard
      if (isDeviceVerified) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // If device NOT verified, allow them to stay on Login page to verify
      return res;
    }

    // If user is on Protected Page
    if (isProtected && !isDeviceVerified) {
      // Redirect to login to complete verification
      return NextResponse.redirect(new URL("/login?verify=true", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Exclude Next internals and API routes from middleware
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
