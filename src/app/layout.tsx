import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/shared/ui/tokens.css";
import "./globals.css";
import { it } from "@/shared/i18n/it";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: it.appName,
  description: it.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
