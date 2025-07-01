import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import './globals.css';
import { NavigationSpinnerProvider } from '@/components/ui/NavigationSpinnerProvider';
import NavigationEvents from '@/components/ui/NavigationEvents';
import { ToastProvider } from "@/components/ui/ToastProvider";
import { QueryProvider } from "@/providers/query-provider";

const APP_NAME = "HomeBake";
const APP_DESCRIPTION = "Manage your bakery with ease.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_NAME,
      template: `%s - ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
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
        <ToastProvider>
          <QueryProvider>
            <NavigationSpinnerProvider>
              <NavigationEvents />
              {children}
            </NavigationSpinnerProvider>
          </QueryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
