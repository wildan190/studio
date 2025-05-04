
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
import { toast } from "@/hooks/use-toast";

interface BudgetListProps {
  budgets: Budget[];
  onDelete: (id: string) => void;
  // onEdit?: (budget: Budget) => void; // Optional: Add edit functionality later
}

export function BudgetList({ budgets, onDelete /*, onEdit */ }: BudgetListProps) {

  const handleDelete = (id: string, category: string) => {
    onDelete(id);
    toast({
        title: "Budget Deleted",
        description: `Budget for ${category} has been removed.`,
        variant: "destructive",
      });
  }

  if (!budgets.length) {
    return <p className="text-muted-foreground text-center py-4">No budgets set yet.</p>;
  }

  // Sort budgets alphabetically by category, then period
  const sortedBudgets = [...budgets].sort((a, b) => {
    const categoryComparison = a.category.localeCompare(b.category);
    if (categoryComparison !== 0) {
        return categoryComparison;
    }
    // If categories are the same, sort by period (e.g., monthly before yearly)
    return a.period.localeCompare(b.period);
  });


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary">
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBudgets.map((budget) => (
            <TableRow key={budget.id}>
              <TableCell className="font-medium">{budget.category}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{budget.period}</Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(budget.amount)}
              </TableCell>
              <TableCell className="text-right space-x-1">
                {/* Edit Button (Optional Future Feature)
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit?.(budget)} // Call edit handler if provided
                  aria-label="Edit budget"
                  disabled // Disable for now
                >
                  <Edit className="h-4 w-4" />
                </Button>
                 */}
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete budget"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleDelete(budget.id, budget.category)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
