import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";
import { CookieConsent } from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl = "https://runmend.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Runmend — Automation Health Monitor",
    template: "%s | Runmend",
  },
  description:
    "Your automations are probably broken. You just don't know it yet. Runmend scans your Make.com and n8n workflows for silent failures, expiring credentials, and broken mappings.",
  keywords: [
    "automation monitoring",
    "Make.com",
    "n8n",
    "workflow health",
    "silent failures",
    "credential expiration",
    "automation audit",
  ],
  authors: [{ name: "Runmend" }],
  creator: "Runmend",
  openGraph: {
    title: "Runmend — Automation Health Monitor",
    description:
      "Your automations are probably broken. You just don't know it yet. Runmend catches silent failures before your clients do.",
    url: siteUrl,
    siteName: "Runmend",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Runmend — Automation Health Monitor",
    description:
      "Your automations are probably broken. You just don't know it yet. Runmend catches silent failures before your clients do.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
        <CookieConsent />
        <Toaster position="top-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}
