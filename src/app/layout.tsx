import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "@/shared/ui/tokens.css";
import "./globals.css";
import { CookieBanner } from "@/features/cookies/ui/CookieBanner";
import { ADOBE_FONTS_ORIGINS, ADOBE_FONTS_STYLESHEET } from "@/shared/cookies/inventory";
import { it } from "@/shared/i18n/it";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/shared/ui/theme";

const machton = localFont({
  src: "./fonts/Machton.ttf",
  variable: "--font-machton",
  weight: "400",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: it.appName,
  description: it.tagline,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="it" className={machton.variable} data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        {ADOBE_FONTS_ORIGINS.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="" />
        ))}
        <link rel="stylesheet" href={ADOBE_FONTS_STYLESHEET} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
