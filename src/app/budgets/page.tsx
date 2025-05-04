"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext'; // Import useAppContext
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetList } from "@/components/BudgetList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ITEMS_PER_PAGE } from "@/lib/constants"; // Import items per page constant


export default function BudgetsPage() {
  const {
    budgets,
    handleAddBudget,
    handleDeleteBudget,
    isClient,
    uuidLoaded,
    authChecked // Get authChecked status
  } = useAppContext(); // Get state and handlers from context

    const [currentPage, setCurrentPage] = React.useState(1);

    // Sort budgets before pagination
    const sortedBudgets = React.useMemo(() => {
        return [...budgets].sort((a, b) => {
            const categoryComparison = a.category.localeCompare(b.category);
            if (categoryComparison !== 0) return categoryComparison;
            return a.period.localeCompare(b.period);
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
             Loading Budgets...
        </footer>
      </div>
    );
  }

  // Render content if authenticated and ready
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Budgets</h1>
        <section id="budgets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="shadow-md rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Add/Edit Budget</CardTitle>
                             <CardDescription>Add a new budget or update an existing one by entering the same category and period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BudgetForm onSubmit={handleAddBudget} existingCategories={budgets.map(b => b.category)} />
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-2">
                    <Card className="shadow-md rounded-lg flex flex-col"> {/* Added flex flex-col */}
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
                        {/* Removed CardContent wrapping BudgetList */}
                         <BudgetList
                            budgets={paginatedBudgets}
                            onDelete={handleDeleteBudget}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            itemsPerPage={ITEMS_PER_PAGE}
                            totalItems={budgets.length} // Use total budgets length
                            />
                    </Card>
                 </div>
            </div>
        </section>
    </main>
  );
}

