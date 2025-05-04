"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import type { Transaction } from "@/types"; // Import Transaction type

export default function TransactionsPage() {
  const {
    transactions,
    handleAddTransaction,
    handleDeleteTransaction,
    currentUser, // Needed for add/delete actions implicitly
    isLoading, // Use loading state from context
    isMutating, // Use mutating state from context
    isClient,
    authChecked
  } = useAppContext();

  const [currentPage, setCurrentPage] = React.useState(1);

   // Sort transactions by date descending before pagination
   const sortedTransactions = React.useMemo(() => {
    // Make sure transactions is always an array
    const validTransactions = Array.isArray(transactions) ? transactions : [];
    return [...validTransactions].sort((a, b) => b.date.getTime() - a.date.getTime());
   }, [transactions]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  // Get transactions for the current page
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFormSubmit = async (data: Omit<Transaction, 'id'>) => {
    if (!currentUser) return; // Should be logged in
    // We need to include the userId when calling the action
     await handleAddTransaction({ ...data, userId: currentUser.id });
  };

  const handleDelete = async (id: string) => {
    await handleDeleteTransaction(id);
  };


   // --- Loading State ---
   if (isLoading || !isClient || !authChecked) {
     return (
       <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
         <Skeleton className="h-8 w-48 mb-4" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-1 space-y-4">
              <Skeleton className="h-[350px] w-full rounded-lg" /> {/* Adjusted height for form */}
           </div>
           <div className="md:col-span-2 space-y-4">
             <Skeleton className="h-12 w-full rounded-lg" />
             <Skeleton className="h-[400px] w-full rounded-lg" /> {/* Adjusted height for list */}
             <Skeleton className="h-10 w-full rounded-lg" /> {/* Pagination skeleton */}
           </div>
         </div>
          <Separator className="my-4" />
         <div className="text-center text-muted-foreground text-sm">Loading Transactions...</div>
       </div>
     );
   }


  // Render content if authenticated and ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Transactions</h1>
         {isMutating && ( // Optional: Show a subtle indicator during mutations
            <div className="text-sm text-muted-foreground italic mb-2">Processing...</div>
         )}
         <section id="transactions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Add New Transaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Pass the async handler to the form */}
                        <TransactionForm onSubmit={handleFormSubmit} />
                    </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card className="shadow-md rounded-lg flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Transaction History</CardTitle>
                    </CardHeader>
                     <TransactionList
                        transactions={paginatedTransactions}
                        onDelete={handleDelete} // Pass the async handler
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={ITEMS_PER_PAGE}
                        totalItems={transactions.length}
                        />
                    </Card>
                </div>
            </div>
        </section>
    </main>
  );
}
