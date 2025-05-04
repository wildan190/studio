import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Home, Briefcase, BarChart, Settings } from 'lucide-react'; // Icons for sidebar

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
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                {/* Placeholder for Logo or App Name */}
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">BizFlow</h2>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
              {/* Navigation Menu */}
              <SidebarMenu>
                 {/* We might need to implement routing later, for now these are just buttons */}
                 <SidebarMenuItem>
                    <SidebarMenuButton href="/" tooltip="Dashboard" isActive={true}>
                       <Home />
                       <span>Dashboard</span>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton href="#budgets" tooltip="Budgets"> {/* Update href when routing is added */}
                       <Briefcase />
                       <span>Budgets</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
                 <SidebarMenuItem>
                     <SidebarMenuButton href="#reports" tooltip="Reports"> {/* Update href when routing is added */}
                       <BarChart />
                       <span>Reports</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
              </SidebarMenu>

              {/* Optional: Settings Group */}
              {/*
              <SidebarGroup className="mt-auto">
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#settings" tooltip="App Settings">
                       <Settings />
                       <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
              */}
            </SidebarContent>
            <SidebarFooter className="p-4 text-xs text-muted-foreground">
               &copy; {new Date().getFullYear()} BizFlow
            </SidebarFooter>
          </Sidebar>

          {/* Main Content Area */}
          <SidebarInset>
             {/* Add a header within the main content area */}
             <header className="flex items-center justify-between border-b bg-card p-4 md:hidden"> {/* Show trigger only on mobile */}
               <h1 className="text-lg font-semibold">BizFlow</h1>
               <SidebarTrigger />
             </header>
             {/* Render page content */}
             {children}
          </SidebarInset>

        </SidebarProvider>
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
