"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { ExpenseReport } from "@/components/ExpenseReport";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export default function ReportsPage() {
  const { transactions, budgets, isLoading, isClient, authChecked } = useAppContext();

    // Use the isLoading state from AppContext
    if (isLoading || !isClient || !authChecked) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
         <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-6">
          <Skeleton className="h-[500px] w-full rounded-lg" /> {/* Taller skeleton for report */}
        </div>
        <Separator className="my-6" />
        <div className="text-center text-muted-foreground text-sm">Loading Reports...</div>
      </div>
    );
  }

  // Render content if authenticated and ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Expense Reports</h1>
        <section id="reports" className="space-y-6">
             <ExpenseReport transactions={transactions} budgets={budgets} />
        </section>
    </main>
  );
}
