import type { Metadata } from "next";
import { headers } from "next/headers";
import { Barlow_Condensed, Geist } from "next/font/google";
import "@/shared/ui/tokens.css";
import "./globals.css";
import { it } from "@/shared/i18n/it";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/shared/ui/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: it.appName,
  description: it.tagline,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${display.variable}`}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
