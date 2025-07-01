import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import PWAWrapper from "@/components/pwa/pwa-wrapper";
import { Providers } from "@/providers/providers";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://homebake.vercel.app'),
  title: {
    default: 'HomeBake - Bakery Management System',
    template: '%s | HomeBake'
  },
  description: 'Professional bakery management system for tracking production, sales, and inventory. Optimized for efficiency with real-time updates and offline capabilities.',
  keywords: ['bakery', 'management', 'production', 'sales', 'inventory', 'POS', 'bread'],
  authors: [{ name: 'HomeBake Team' }],
  creator: 'HomeBake',
  publisher: 'HomeBake',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'HomeBake',
    title: 'HomeBake - Bakery Management System',
    description: 'Professional bakery management system for tracking production, sales, and inventory.',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'HomeBake Logo',
      }
    ],
  },
  twitter: {
    card: 'summary',
    title: 'HomeBake - Bakery Management System',
    description: 'Professional bakery management system for tracking production, sales, and inventory.',
    images: ['/icons/icon-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#f97316',
  colorScheme: 'light',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HomeBake',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HomeBake" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={cn(geistSans.variable, geistMono.variable, "font-sans antialiased")}>
        <Providers>
          <PWAWrapper>
            {children}
          </PWAWrapper>
        </Providers>
        <Toaster 
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
