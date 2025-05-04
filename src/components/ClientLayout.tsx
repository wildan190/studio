
"use client";

import * as React from 'react';
import { usePathname } from 'next/navigation';
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
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { Home, Briefcase, BarChart, Settings, List } from 'lucide-react'; // Added List icon

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); // Get current path
  // No need to call useSidebar here directly if only needed in the button

  return (
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
             <SidebarMenuItem>
                <SidebarMenuButton href="/" tooltip="Dashboard" isActive={pathname === '/'}>
                   <Home />
                   <span>Dashboard</span>
                </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton href="/transactions" tooltip="Transactions" isActive={pathname === '/transactions'}>
                   <List />
                   <span>Transactions</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton href="/budgets" tooltip="Budgets" isActive={pathname === '/budgets'}>
                   <Briefcase />
                   <span>Budgets</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton href="/reports" tooltip="Reports" isActive={pathname === '/reports'}>
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
  );
}
