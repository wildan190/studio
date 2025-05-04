"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetList } from "@/components/BudgetList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export default function BudgetsPage() {
  const {
    budgets,
    handleAddBudget,
    handleDeleteBudget,
    currentUser, // Needed for add/delete actions implicitly
    isLoading, // Use loading state from context
    isMutating, // Use mutating state from context
    isClient,
    authChecked
  } = useAppContext();

    const [currentPage, setCurrentPage] = React.useState(1);

    // Sort budgets before pagination
    const sortedBudgets = React.useMemo(() => {
        return [...budgets].sort((a, b) => {
            const categoryComparison = a.category.localeCompare(b.category);
            if (categoryComparison !== 0) return categoryComparison;
            // Ensure period exists before comparing (though it should always exist)
            return (a.period || '').localeCompare(b.period || '');
        });
    }, [budgets]);


    // Calculate total pages
    const totalPages = Math.ceil(sortedBudgets.length / ITEMS_PER_PAGE);

    // Get budgets for the current page
    const paginatedBudgets = sortedBudgets.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Calculate total budget from *all* budgets, not just paginated ones
    const totalBudget = React.useMemo(() => {
      return budgets.reduce((sum, budget) => sum + budget.amount, 0);
    }, [budgets]);

     const formatCurrency = (value: number) => {
       return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
     }

     const handleFormSubmit = async (data: Omit<Budget, 'id'>) => {
         if (!currentUser) return; // Should be logged in to reach here
         await handleAddBudget({ ...data, userId: currentUser.id });
     };

     const handleDelete = async (id: string) => {
         await handleDeleteBudget(id);
     };


    // --- Loading State ---
    if (isLoading || !isClient || !authChecked) {
        return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
                 <Skeleton className="h-[250px] w-full rounded-lg" />
            </div>
            <div className="md:col-span-2 space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-[300px] w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" /> {/* Pagination skeleton */}
            </div>
            </div>
             <Separator className="my-4" />
            <div className="text-center text-muted-foreground text-sm">Loading Budgets...</div>
        </div>
        );
    }

  // Render content if authenticated and ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Budgets</h1>
         {isMutating && ( // Optional: Show a subtle indicator during mutations
            <div className="text-sm text-muted-foreground italic mb-2">Processing...</div>
         )}
        <section id="budgets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="shadow-md rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Add/Edit Budget</CardTitle>
                             <CardDescription>Add a new budget or update an existing one by entering the same category and period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {/* Pass the async handler to the form */}
                            <BudgetForm onSubmit={handleFormSubmit} existingCategories={budgets.map(b => b.category)} />
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-2">
                    <Card className="shadow-md rounded-lg flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">Budget List</CardTitle>
                                    <CardDescription>Current budgets set for different categories.</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Budget</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(totalBudget)}</p>
                                </div>
                            </div>
                        </CardHeader>
                         <BudgetList
                            budgets={paginatedBudgets}
                            onDelete={handleDelete} // Pass the async handler
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            itemsPerPage={ITEMS_PER_PAGE}
                            totalItems={budgets.length}
                            />
                    </Card>
                 </div>
            </div>
        </section>
    </main>
  );
}
