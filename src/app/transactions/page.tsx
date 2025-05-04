"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext'; // Import useAppContext
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TransactionsPage() {
  const {
    transactions,
    handleAddTransaction,
    handleDeleteTransaction,
    isClient,
    uuidLoaded,
    authChecked // Get authChecked status
  } = useAppContext(); // Get state and handlers from context

  // Updated Loading State: Wait for client, uuid, and auth check
  if (!isClient || !uuidLoaded || !authChecked) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="space-y-6">
          <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
          <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
        </div>
        <footer className="mt-12 text-center text-muted-foreground text-sm">
            <Separator className="my-4" />
             Loading Transactions...
        </footer>
      </div>
    );
  }

  // Render content if authenticated and ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Transactions</h1>
         <section id="transactions" className="space-y-6">
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
    </main>
  );
}
