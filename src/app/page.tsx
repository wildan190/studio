
"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext'; // Import useAppContext
import { CashFlowSummary } from "@/components/CashFlowSummary";
import { BudgetedVsNonBudgetedExpenses } from "@/components/BudgetedVsNonBudgetedExpenses"; // Import the new component
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Keep Card for structure if needed

export default function DashboardPage() {
  const { transactions, budgets, isClient, uuidLoaded } = useAppContext(); // Get state from context

  // Render loading state or skeleton if not client or essential libs not loaded yet
  if (!isClient || !uuidLoaded) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        {/* Basic Skeleton or Loading State inside the main content area */}
        <div className="space-y-6">
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-60 bg-muted rounded-lg animate-pulse mb-6"></div>
          <div className="h-80 bg-muted rounded-lg animate-pulse"></div> {/* Skeleton for the new section */}
        </div>
         <footer className="mt-12 text-center text-muted-foreground text-sm">
            <Separator className="my-4" />
             Loading Dashboard...
        </footer>
      </div>
    );
  }

  // Render the main application UI once client and libs are ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Dashboard Section */}
        <section id="dashboard" className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            {/* Existing Cash Flow Summary */}
            <CashFlowSummary transactions={transactions} />

            {/* New Budgeted vs Non-Budgeted Expenses Section */}
            <BudgetedVsNonBudgetedExpenses transactions={transactions} budgets={budgets} />

            {/* Add more dashboard-specific widgets here if needed in the future */}
            {/* Example:
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
                    <CardContent><p>Placeholder for quick stats...</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                    <CardContent><p>Placeholder for recent activity...</p></CardContent>
                </Card>
            </div>
             */}
        </section>

        {/* Remove Transactions, Budgets, and Reports sections from dashboard */}
    </main>
  );
}
