import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { AuthProvider } from "@/lib/authContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { geist, caveat } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Doodles — The world is your canvas",
  description:
    "Pin your adventures, doodle your memories, and explore the stories your friends leave around the world.",
  keywords: ["travel", "doodle", "social", "map", "adventure", "memories"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${caveat.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AuthModal />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
