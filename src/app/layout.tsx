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
    default: "Runmend — Production monitoring for Make.com and n8n agencies",
    template: "%s | Runmend",
  },
  description:
    "Catch silent failures across every client's Make.com (4 zones) and self-hosted n8n workspace. Six failure detectors, AI post-mortems, per-channel alerting. Plus Pre-flight Check — assert workflow output quality, latency and cost before a change ships. Built for agencies running automations in production.",
  keywords: [
    "Make.com monitoring",
    "n8n monitoring",
    "automation alerting",
    "agency automation tools",
    "client automation monitoring",
    "self-hosted n8n monitoring",
    "Make.com",
    "n8n",
    "silent failures",
    "credential expiration",
    "pre-flight testing",
    "LLM output assertions",
  ],
  authors: [{ name: "Runmend" }],
  creator: "Runmend",
  openGraph: {
    title: "Runmend — Production monitoring for Make.com and n8n agencies",
    description:
      "Built for agencies running client automations in production. Multi-zone Make.com + self-hosted n8n, six failure detectors, AI post-mortems, and Pre-flight Check. Get told before the client does.",
    url: siteUrl,
    siteName: "Runmend",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Runmend — Production monitoring for Make.com and n8n agencies",
    description:
      "Built for agencies running client automations in production. Multi-zone Make.com + self-hosted n8n, six failure detectors, AI post-mortems, and Pre-flight Check. Get told before the client does.",
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
