import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Automatically load environment variables from backend/.env, root .env, or frontend/.env
const candidateEnvPaths = [
  path.resolve(process.cwd(), "../backend/.env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.local"),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = stringsTrim(trimmed.slice(0, eqIdx));
          let val = stringsTrim(trimmed.slice(eqIdx + 1));
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key] && val) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

function stringsTrim(s: string) {
  return s.trim();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/media/files/:path*",
        destination: `${backendUrl}/media/files/:path*`,
      },
    ];
  },
};

export default nextConfig;
