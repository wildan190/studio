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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAppContext } from "@/context/AppContext"; // Import context

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void> | void; // Update signature
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function TransactionList({
    transactions,
    onDelete,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems
 }: TransactionListProps) {
    const { isMutating } = useAppContext(); // Get mutation state

    const handleDeleteClick = async (id: string) => {
        // Toast is handled by the page/action now
        await onDelete(id);
    }

  if (!transactions.length && totalItems === 0) {
    return <p className="text-muted-foreground text-center p-4">No transactions yet.</p>;
  }

  return (
     <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow rounded-md border">
            <Table>
            <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                 {transactions.length > 0 ? (
                    transactions.map((transaction) => (
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
                                transaction.type === "income" ? "text-[hsl(var(--chart-1))]" : "text-destructive"
                            }`}
                            >
                            {transaction.type === "income" ? "+" : "-"}
                            {transaction.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(transaction.id)}
                                aria-label="Delete transaction"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isMutating} // Disable during mutation
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </TableCell>
                        </TableRow>
                    ))
                 ) : (
                     <TableRow>
                         <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                           No transactions on this page.
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
            itemName="transactions"
         />
     </div>
  );
}
