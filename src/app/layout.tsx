import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/PostHogProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FlowCheck — Automation Health Monitor",
  description:
    "Your automations are probably broken. You just don't know it yet. FlowCheck scans your Zapier, Make.com, and n8n workflows for silent failures, expiring credentials, and broken mappings.",
  openGraph: {
    title: "FlowCheck — Automation Health Monitor",
    description:
      "Your automations are probably broken. You just don't know it yet.",
    type: "website",
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
      </body>
    </html>
  );
}
