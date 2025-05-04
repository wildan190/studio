"use client";

import * as React from "react";
import { Trash2, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Budget } from "@/types";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAppContext } from "@/context/AppContext"; // Import context

interface BudgetListProps {
  budgets: Budget[];
  onDelete: (id: string) => Promise<void> | void; // Update signature
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function BudgetList({
    budgets,
    onDelete,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems
}: BudgetListProps) {
    const { isMutating } = useAppContext(); // Get mutation state

  const handleDelete = async (id: string, category: string) => {
    // Toast is handled by the page/action now
    await onDelete(id);
  }

  if (!budgets.length && totalItems === 0) {
    return <p className="text-muted-foreground text-center p-4">No budgets set yet.</p>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  }

  return (
    <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                 {budgets.length > 0 ? (
                    budgets.map((budget) => (
                        <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.category}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className="capitalize">{budget.period}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                            {formatCurrency(budget.amount)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Delete budget"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={isMutating} // Disable during mutation
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the budget
                                        for <span className="font-semibold">{budget.category} ({budget.period})</span>.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(budget.id, budget.category)}
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        disabled={isMutating} // Disable during mutation
                                        >
                                        {isMutating ? 'Deleting...' : 'Delete'}
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        </TableRow>
                    ))
                 ) : (
                    <TableRow>
                         <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No budgets on this page.
                         </TableCell>
                     </TableRow>
                 )}
                </TableBody>
            </Table>
        </ScrollArea>
        <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            itemName="budgets"
        />
    </div>
  );
}
