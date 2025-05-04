"use client";

import * as React from 'react';
import Link from 'next/link'; // Import Link
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext'; // Import AppContext
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button'; // Import Button
import { Home, Briefcase, BarChart, List, LogOut, Users, ShieldAlert } from 'lucide-react'; // Added List, LogOut, Users icons
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'; // Import Card components

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); // Get current path
  const { currentUser, logout, authChecked } = useAppContext(); // Get currentUser and logout from context

  // Don't render layout content until authentication check is complete
  // This prevents flashing the layout for unauthenticated users being redirected.
   if (!authChecked) {
     // Optional: You could return a full-page loader here
     return null; // Or <FullPageLoader />;
   }

  // If no user is logged in, render only the children (likely the Login page)
  if (!currentUser) {
    return <>{children}</>;
  }

   // --- Permission Check ---
   // Superadmins can access everything.
   // Users page access is already handled by role check in AppContext redirect.
   // For other pages, check the user's permissions array.
   const canAccessPage =
       currentUser.role === 'superadmin' ||
       pathname === '/' || // All logged-in users can access dashboard
       pathname === '/login' || // Allow access to login page (though redirect handles this)
       pathname === '/users' || // Role check is done elsewhere
       (currentUser.permissions?.includes(pathname));


  // If user is logged in, render the full admin layout
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">BizFlow</h2>
              </div>
               {/* Mobile-only trigger - remains inside header for mobile */}
               <div className="md:hidden">
                    <SidebarTrigger />
                </div>
          </div>
           <p className="text-xs text-muted-foreground mt-1">Welcome, {currentUser.username}!</p>
        </SidebarHeader>
        <SidebarContent className="p-2">
          {/* Navigation Menu - Conditionally render based on permissions */}
          <SidebarMenu>
             {currentUser.permissions?.includes('/') && (
                 <SidebarMenuItem>
                    <SidebarMenuButton href="/" tooltip="Dashboard" isActive={pathname === '/'}>
                       <Home />
                       <span>Dashboard</span>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
             )}
             {currentUser.permissions?.includes('/transactions') && (
                 <SidebarMenuItem>
                     <SidebarMenuButton href="/transactions" tooltip="Transactions" isActive={pathname.startsWith('/transactions')}>
                       <List />
                       <span>Transactions</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
             )}
             {currentUser.permissions?.includes('/budgets') && (
                 <SidebarMenuItem>
                     <SidebarMenuButton href="/budgets" tooltip="Budgets" isActive={pathname.startsWith('/budgets')}>
                       <Briefcase />
                       <span>Budgets</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
             )}
              {currentUser.permissions?.includes('/reports') && (
                 <SidebarMenuItem>
                     <SidebarMenuButton href="/reports" tooltip="Reports" isActive={pathname.startsWith('/reports')}>
                       <BarChart />
                       <span>Reports</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
             )}
              {/* User Management Link (Superadmin Only) */}
             {currentUser.role === 'superadmin' && (
                 <SidebarMenuItem>
                     <SidebarMenuButton href="/users" tooltip="User Management" isActive={pathname.startsWith('/users')}>
                       <Users />
                       <span>Users</span>
                     </SidebarMenuButton>
                 </SidebarMenuItem>
             )}
          </SidebarMenu>

        </SidebarContent>
        <SidebarFooter className="p-4 flex flex-col space-y-2">
            <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                 <LogOut className="mr-2 h-4 w-4" />
                 <span>Logout</span>
             </Button>
           <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BizFlow</p>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset>
         {/* Header within main content - Desktop trigger moved here */}
         <header className="flex items-center justify-between border-b bg-card p-4">
           {/* Show title only on desktop, as mobile has it in the sidebar header */}
           <h1 className="text-lg font-semibold hidden md:block">BizFlow Dashboard</h1>
           {/* Desktop-only trigger */}
           <div className="hidden md:block">
               <SidebarTrigger />
           </div>
            {/* Mobile has trigger in sidebar header */}
         </header>
         {/* Render page content or Access Denied message */}
          {canAccessPage ? (
                children
            ) : (
                 <div className="flex flex-1 items-center justify-center p-4 md:p-6">
                     <Card className="w-full max-w-md shadow-lg border-destructive">
                         <CardHeader className="flex flex-row items-center gap-4">
                              <ShieldAlert className="h-8 w-8 text-destructive" />
                              <CardTitle className="text-destructive">Access Denied</CardTitle>
                         </CardHeader>
                         <CardContent>
                             <p className="text-muted-foreground">You do not have permission to access this page ({pathname}). Please contact an administrator if you believe this is an error.</p>
                             <Button variant="outline" onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
                         </CardContent>
                     </Card>
                 </div>
             )}
      </SidebarInset>
    </SidebarProvider>
  );
}
