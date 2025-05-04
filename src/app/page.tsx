
"use client";

import * as React from "react";
import type { v4 as uuidv4 } from 'uuid'; // Import type only initially

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// Removed Tabs imports as navigation is handled by sidebar now
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { CashFlowSummary } from "@/components/CashFlowSummary";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetList } from "@/components/BudgetList";
import { ExpenseReport } from "@/components/ExpenseReport";
import type { Transaction, Budget } from "@/types";
import useLocalStorage from "@/hooks/useLocalStorage";

// Define a state to hold the dynamically imported uuid function
let generateUuid: typeof uuidv4 | null = null;

export default function Home() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("bizflow_transactions", []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>("bizflow_budgets", []);
  const [isClient, setIsClient] = React.useState(false);
  const [uuidLoaded, setUuidLoaded] = React.useState(false);

  // Dynamically import uuid on component mount (client-side only)
  React.useEffect(() => {
    setIsClient(true);
    import('uuid')
      .then((uuidModule) => {
        generateUuid = uuidModule.v4;
        setUuidLoaded(true);
      })
      .catch(err => console.error("Failed to load uuid", err));
  }, []);

  const handleAddTransaction = (data: Omit<Transaction, 'id'>) => {
    if (!generateUuid) {
      console.error("UUID generation function not loaded");
      // Optionally, show a user-facing error message
      return;
    }
    const newTransaction: Transaction = {
      ...data,
      id: generateUuid(),
      date: new Date(data.date), // Ensure date is a Date object
    };
    setTransactions(prevTransactions =>
      [...prevTransactions, newTransaction].sort((a, b) => b.date.getTime() - a.date.getTime())
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleAddBudget = (data: Omit<Budget, 'id'>) => {
     if (!generateUuid) {
       console.error("UUID generation function not loaded");
       return;
     }
     // Check if budget for this category and period already exists
     const existingBudget = budgets.find(b => b.category.toLowerCase() === data.category.toLowerCase() && b.period === data.period);
     if (existingBudget) {
       // Update existing budget
       const updatedBudgets = budgets.map(b =>
         b.id === existingBudget.id ? { ...b, amount: data.amount } : b
       );
       setBudgets(updatedBudgets);
     } else {
       // Add new budget
       const newBudget: Budget = {
         ...data,
         id: generateUuid(),
       };
       setBudgets(prevBudgets =>
         [...prevBudgets, newBudget].sort((a, b) => a.category.localeCompare(b.category))
        );
     }
   };

  const handleDeleteBudget = (id: string) => {
    setBudgets(budgets.filter((b) => b.id !== id));
  };


  // Render loading state or skeleton if not client or uuid not loaded yet
  if (!isClient || !uuidLoaded) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        {/* Basic Skeleton or Loading State inside the main content area */}
        <div className="space-y-6">
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-60 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
        </div>
         <footer className="mt-12 text-center text-muted-foreground text-sm">
            <Separator className="my-4" />
             Loading...
        </footer>
      </div>
    );
  }

  // Render the main application UI once client and uuid are ready
  // Removed the outer container div, SidebarInset provides the main area
  // Removed header and footer, handled in layout.tsx
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        {/* Dashboard Section */}
        <section id="dashboard" className="space-y-6">
            <CashFlowSummary transactions={transactions} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Add New Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionForm onSubmit={handleAddTransaction} />
                </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
                </CardContent>
                </Card>
            </div>
            </div>
        </section>

        <Separator className="my-4" />

        {/* Budgets Section */}
        <section id="budgets" className="space-y-6">
             <h2 className="text-2xl font-semibold">Budgets</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="shadow-md rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Add/Edit Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BudgetForm onSubmit={handleAddBudget} existingCategories={budgets.map(b => b.category)} />
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-2">
                    <Card className="shadow-md rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Budget List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BudgetList budgets={budgets} onDelete={handleDeleteBudget} />
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </section>

        <Separator className="my-4" />

        {/* Reports Section */}
        <section id="reports" className="space-y-6">
            <h2 className="text-2xl font-semibold">Reports</h2>
             <ExpenseReport transactions={transactions} budgets={budgets} />
        </section>

    </main>
  );
}
