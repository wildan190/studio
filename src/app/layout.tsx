import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/context/AppContext'; // Import AppProvider
import ClientLayout from '@/components/ClientLayout'; // Import ClientLayout

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Wrap the client layout and children with AppProvider */}
        <AppProvider>
          {/* Use ClientLayout to handle sidebar and main content structure */}
          <ClientLayout>{children}</ClientLayout>
        </AppProvider>
        <Toaster />
      </body>
    </html>
  );
}
