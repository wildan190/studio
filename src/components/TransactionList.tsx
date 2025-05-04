"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2, PlusCircle, MinusCircle } from "lucide-react";
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
import type { Transaction } from "@/types";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (!transactions.length) {
    return <p className="text-muted-foreground text-center py-4">No transactions yet.</p>;
  }

  // Sort transactions by date, most recent first
  const sortedTransactions = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <ScrollArea className="h-[300px] rounded-md border">
        <Table>
        <TableHeader className="sticky top-0 bg-secondary">
            <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Action</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {sortedTransactions.map((transaction) => (
            <TableRow key={transaction.id}>
                <TableCell>
                {transaction.type === "income" ? (
                    <PlusCircle className="h-5 w-5 text-green-500" title="Income" />
                ) : (
                    <MinusCircle className="h-5 w-5 text-red-500" title="Expense" />
                )}
                </TableCell>
                <TableCell className="font-medium">{transaction.description}</TableCell>
                <TableCell>{format(transaction.date, "PPP")}</TableCell>
                <TableCell
                className={`text-right font-semibold ${
                    transaction.type === "income" ? "text-green-600" : "text-red-600"
                }`}
                >
                {transaction.type === "income" ? "+" : "-"}
                {transaction.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
                </TableCell>
                <TableCell className="text-right">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(transaction.id)}
                    aria-label="Delete transaction"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </ScrollArea>
  );
}
