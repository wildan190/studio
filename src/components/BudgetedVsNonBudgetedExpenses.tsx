
"use client";

import * as React from "react";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Transaction, Budget } from "@/types";
import { cn } from "@/lib/utils";

interface BudgetedVsNonBudgetedExpensesProps {
  transactions: Transaction[];
  budgets: Budget[];
}

export function BudgetedVsNonBudgetedExpenses({ transactions, budgets }: BudgetedVsNonBudgetedExpensesProps) {
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  // 1. Filter expenses for the current month
  const monthlyExpenses = transactions.filter(
    (t) => t.type === "expense" && isWithinInterval(t.date, { start: startDate, end: endDate })
  );

  // 2. Get budget categories for the 'monthly' period (store lowercase)
  const monthlyBudgetCategoriesLower = new Set(
    budgets.filter(b => b.period === "monthly").map(b => b.category.toLowerCase())
  );

  // 3. Categorize expenses (compare lowercase)
  const budgetedExpenses: Transaction[] = [];
  const nonBudgetedExpenses: Transaction[] = [];

  monthlyExpenses.forEach(expense => {
    // Convert transaction description to lowercase for comparison
    if (monthlyBudgetCategoriesLower.has(expense.description.toLowerCase())) {
      budgetedExpenses.push(expense);
    } else {
      nonBudgetedExpenses.push(expense);
    }
  });

  // Calculate totals
  const totalBudgeted = budgetedExpenses.reduce((sum, t) => sum + t.amount, 0);
  const totalNonBudgeted = nonBudgetedExpenses.reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  }

  const renderTransactionTable = (expenseList: Transaction[], title: string, total: number) => (
    <Card className="flex-1 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant={title.includes("Budgeted") ? "secondary" : "outline"}>{formatCurrency(total)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {expenseList.length > 0 ? (
          <ScrollArea className="h-[250px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseList.sort((a, b) => b.date.getTime() - a.date.getTime()).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-xs text-muted-foreground">{format(transaction.date, "dd MMM")}</TableCell>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                       {formatCurrency(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-4">No {title.toLowerCase().split(" ")[0]} expenses for this month.</p> // Simplified message
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card>
        <CardHeader>
            <CardTitle>Monthly Expense Breakdown</CardTitle>
            <CardDescription>
                Expenses categorized based on whether they match a set monthly budget ({format(now, 'MMMM yyyy')}). Comparison is case-insensitive.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderTransactionTable(budgetedExpenses, "Budgeted Expenses", totalBudgeted)}
                {renderTransactionTable(nonBudgetedExpenses, "Non-Budgeted Expenses", totalNonBudgeted)}
            </div>
        </CardContent>
    </Card>
  );
}
