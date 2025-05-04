"use client";

import * as React from "react";
import { v4 as uuidv4 } from 'uuid'; // Use uuid for generating unique IDs

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { CashFlowSummary } from "@/components/CashFlowSummary";
import type { Transaction } from "@/types";
import useLocalStorage from "@/hooks/useLocalStorage";

// Lazily import uuid to avoid server-side issues
let uuid: typeof uuidv4 | null = null;
const loadUuid = async () => {
  if (!uuid) {
    const uuidModule = await import('uuid');
    uuid = uuidModule.v4;
  }
  return uuid;
};


export default function Home() {
  // Use the custom hook to manage transactions state with localStorage
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("bizflow_transactions", []);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    loadUuid(); // Load uuid on client mount
  }, []);


  const handleAddTransaction = async (data: Omit<Transaction, 'id'>) => {
    const generateId = await loadUuid();
    if (!generateId) {
        console.error("UUID generation function not loaded");
        // Handle error appropriately, maybe show a toast notification
        return;
    }
    const newTransaction: Transaction = {
      ...data,
      id: generateId(), // Generate a unique ID
      // Ensure date is a Date object (already handled by form/parsing)
      date: new Date(data.date),
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // Avoid rendering components reliant on localStorage until client-side hydration
  if (!isClient) {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6 text-primary text-center">BizFlow</h1>
             {/* Basic Skeleton or Loading State */}
             <div className="space-y-6">
                <div className="h-40 bg-muted rounded-lg animate-pulse"></div>
                <div className="h-60 bg-muted rounded-lg animate-pulse"></div>
                <div className="h-80 bg-muted rounded-lg animate-pulse"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-primary">BizFlow</h1>
        <p className="text-muted-foreground">Simple Cashflow Management for UMKM</p>
      </header>

      <main className="space-y-6">
         {/* Summary Section */}
        <CashFlowSummary transactions={transactions} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Transaction Section */}
          <div className="md:col-span-1">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Add New Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionForm onSubmit={handleAddTransaction} />
              </CardContent>
            </Card>
          </div>

          {/* Transaction List Section */}
          <div className="md:col-span-2">
             <Card className="shadow-md">
               <CardHeader>
                 <CardTitle className="text-lg">Transaction History</CardTitle>
               </CardHeader>
               <CardContent>
                 <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
               </CardContent>
             </Card>
          </div>
        </div>

      </main>

      <footer className="mt-12 text-center text-muted-foreground text-sm">
        <Separator className="my-4" />
        &copy; {new Date().getFullYear()} BizFlow. Built with Next.js.
      </footer>
    </div>
  );
}
