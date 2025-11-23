import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Preview Cron - Test Vercel Cron Jobs on Preview & Local",
  description: "Developer tool to test and trigger Vercel cron jobs on preview deployments and local environments. Debug and run scheduled tasks before production. Not affiliated with Vercel Inc.",
  metadataBase: new URL("https://previewcron.dev"),
  keywords: ["vercel", "cron", "cron jobs", "preview", "developer tools", "testing", "next.js"],
  authors: [{ name: "Ludovic Gueth" }],
  creator: "Ludovic Gueth",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://previewcron.dev",
    siteName: "Preview Cron",
    title: "Preview Cron - Test Vercel Cron Jobs on Preview & Local",
    description: "Developer tool to test and trigger Vercel cron jobs on preview deployments and local environments. Debug and run scheduled tasks before production.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Preview Cron - Test Vercel Cron Jobs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preview Cron - Test Vercel Cron Jobs on Preview & Local",
    description: "Developer tool to test and trigger Vercel cron jobs on preview deployments and local environments.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
