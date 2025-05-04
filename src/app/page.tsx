"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { CashFlowSummary } from "@/components/CashFlowSummary";
import { BudgetedVsNonBudgetedExpenses } from "@/components/BudgetedVsNonBudgetedExpenses";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export default function DashboardPage() {
  const { transactions, budgets, isLoading, isClient, authChecked } = useAppContext();

  // Use the isLoading state from AppContext
  if (isLoading || !isClient || !authChecked) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Basic Skeleton or Loading State inside the main content area */}
         <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-6">
          <Skeleton className="h-60 w-full rounded-lg mb-6" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
         <Separator className="my-6" />
         <div className="text-center text-muted-foreground text-sm">Loading Dashboard...</div>
      </div>
    );
  }

  // Render the main application UI once ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <section id="dashboard" className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <CashFlowSummary transactions={transactions} />
            <BudgetedVsNonBudgetedExpenses transactions={transactions} budgets={budgets} />
        </section>
    </main>
  );
}
