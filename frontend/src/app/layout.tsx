import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { geist, caveat } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Doodles — The world is your canvas",
  description:
    "Pin your adventures, doodle your memories, and explore the stories your friends leave around the world.",
  keywords: ["travel", "doodle", "social", "map", "adventure", "memories"],
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
