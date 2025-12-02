import type { NextConfig } from "next";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : undefined;

const remotePatterns = [
  ...(supabaseHostname
    ? [
      {
        protocol: "https" as const,
        hostname: supabaseHostname,
      },
    ]
    : []),
  {
    protocol: "https" as const,
    hostname: "www.gravatar.com",
  },
  {
    protocol: "https" as const,
    hostname: "logo.clearbit.com",
  },
  {
    protocol: "https" as const,
    hostname: "cdn.brandfetch.io",
  },
  {
    protocol: "https" as const,
    hostname: "img.logo.dev",
  },
  {
    protocol: "https" as const,
    hostname: "cdn.simpleicons.org",
  },
  {
    protocol: "https" as const,
    hostname: "unavatar.io",
  },
  {
    protocol: "https" as const,
    hostname: "play-lh.googleusercontent.com",
  },
  {
    protocol: "https" as const,
    hostname: "*.com.tr",
  },
  {
    protocol: "https" as const,
    hostname: "*.com",
  },
  {
    protocol: "https" as const,
    hostname: "picsum.photos",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
