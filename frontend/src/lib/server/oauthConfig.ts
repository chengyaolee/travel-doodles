import fs from "fs";
import path from "path";

let backendEnvLoaded = false;

function cleanEnvValue(val: string | undefined): string {
  if (!val) return "";
  let v = val.trim();
  // Strip surrounding double quotes, single quotes, or backticks commonly introduced in copy-pasting
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith("`") && v.endsWith("`"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Loads environment variables from local .env files into process.env if not already set.
 * On Vercel, process.env is provided directly by the platform runtime.
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
            const val = cleanEnvValue(trimmed.slice(eqIdx + 1));
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
  microsoftTenantId: string;
  backendUrl: string;
  appUrl: string;
}

export function getOAuthConfig(): OAuthConfig {
  loadBackendEnv();

  return {
    googleClientId: cleanEnvValue(process.env.GOOGLE_CLIENT_ID),
    googleClientSecret: cleanEnvValue(process.env.GOOGLE_CLIENT_SECRET),
    microsoftClientId: cleanEnvValue(process.env.MICROSOFT_CLIENT_ID),
    microsoftClientSecret: cleanEnvValue(process.env.MICROSOFT_CLIENT_SECRET),
    microsoftTenantId: cleanEnvValue(process.env.MICROSOFT_TENANT_ID) || "common",
    backendUrl: cleanEnvValue(process.env.BACKEND_URL).replace(/\/+$/, ""),
    appUrl: cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL).replace(/\/+$/, ""),
  };
}
