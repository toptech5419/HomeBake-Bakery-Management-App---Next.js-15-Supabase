import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import './globals.css';
import { NavigationSpinnerProvider } from '@/components/ui/NavigationSpinnerProvider';
import NavigationEvents from '@/components/ui/NavigationEvents';
import { ToastProvider } from "@/components/ui/ToastProvider";
import { QueryProvider } from "@/providers/query-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import PWAWrapper from "@/components/pwa/pwa-wrapper";

const APP_NAME = "HomeBake";
const APP_DESCRIPTION = "Manage your bakery with ease.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
    startupImage: "/icons/icon-512x512.png",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/screenshots/mobile-1.png",
        width: 400,
        height: 800,
        alt: "HomeBake Mobile Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    images: ["/screenshots/mobile-1.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/icon-192x192.png",
        color: "#f97316",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
        suppressHydrationWarning
      >
        <PWAWrapper>
          <ToastProvider>
            <QueryProvider>
              <NavigationSpinnerProvider>
                <NavigationEvents />
                {children}
                <OfflineIndicator showDetails={true} />
                <InstallPrompt variant="floating" autoShow={true} />
              </NavigationSpinnerProvider>
            </QueryProvider>
          </ToastProvider>
        </PWAWrapper>
      </body>
    </html>
  );
}
