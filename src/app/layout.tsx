import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/context/AppContext'; // Import AppProvider
import ClientLayout from '@/components/ClientLayout'; // Import ClientLayout
import * as React from 'react'; // Import React

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BizFlow - UMKM Cashflow Manager',
  description: 'Simple cashflow management for small businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ClientLayout and AppProvider handle client-side logic,
  // so they don't need explicit isClient checks here usually.
  // However, wrapping helps ensure nothing attempts server-only operations improperly.
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProvider>
          {/* ClientLayout now handles conditional rendering based on auth */}
          <ClientLayout>{children}</ClientLayout>
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
