import fs from "fs";
import path from "path";

let backendEnvLoaded = false;

/**
 * Loads environment variables from backend/.env or root .env into process.env if not already set.
 * This guarantees Next.js server route handlers have access to GOOGLE_CLIENT_ID,
 * GOOGLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, etc.
 */
export function loadBackendEnv(): void {
  if (backendEnvLoaded) return;
  backendEnvLoaded = true;

  const candidateEnvPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "frontend/.env.local"),
    path.resolve(process.cwd(), "frontend/.env"),
    path.resolve(process.cwd(), "backend/.env"),
    path.resolve(process.cwd(), "../backend/.env"),
    path.resolve(process.cwd(), "../../backend/.env"),
    path.resolve(process.cwd(), "../.env"),
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
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
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
        // ignore read error
      }
    }
  }
}

export interface OAuthConfig {
  googleClientId: string;
  googleClientSecret: string;
  microsoftClientId: string;
  microsoftClientSecret: string;
  backendUrl: string;
  appUrl: string;
}

export function getOAuthConfig(): OAuthConfig {
  loadBackendEnv();

  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || "",
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    backendUrl: process.env.BACKEND_URL || "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
  };
}
