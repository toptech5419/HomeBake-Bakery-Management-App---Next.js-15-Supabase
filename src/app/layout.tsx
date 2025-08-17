import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/mobile-optimization.css";
import PWAWrapper from "@/components/pwa/pwa-wrapper";
import { Providers } from "@/providers/providers";
import { cn } from "@/lib/utils";
import { EnhancedErrorBoundary } from "@/components/ui/error-boundary-enhanced";
import { OptimizedToastProvider } from "@/components/ui/toast-optimized";

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HomeBake',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f97316',
  colorScheme: 'light',
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
        <EnhancedErrorBoundary componentName="RootLayout" showDetails={process.env.NODE_ENV === 'development'}>
          <OptimizedToastProvider>
            <Providers>
              <PWAWrapper>
                {children}
              </PWAWrapper>
            </Providers>
          </OptimizedToastProvider>
        </EnhancedErrorBoundary>
      </body>
    </html>
  );
}
