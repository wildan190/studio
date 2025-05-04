
"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext'; // Import useAppContext
import { ExpenseReport } from "@/components/ExpenseReport";
import { Separator } from "@/components/ui/separator";

export default function ReportsPage() {
  const { transactions, budgets, isClient, uuidLoaded } = useAppContext(); // Get state from context

    // Render loading state
  if (!isClient || !uuidLoaded) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-[500px] bg-muted rounded-lg animate-pulse"></div> {/* Taller skeleton for report */}
        </div>
        <footer className="mt-12 text-center text-muted-foreground text-sm">
            <Separator className="my-4" />
             Loading Reports...
        </footer>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Expense Reports</h1>
        <section id="reports" className="space-y-6">
             <ExpenseReport transactions={transactions} budgets={budgets} />
        </section>
    </main>
  );
}
