"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, MinusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Transaction, TransactionType } from "@/types";
import { useAppContext } from "@/context/AppContext"; // Import context

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({ required_error: "Date is required" }),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
   // onSubmit expects the raw form data. Page component adds userId.
  onSubmit: (data: TransactionFormValues) => Promise<void> | void;
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
   const { isMutating } = useAppContext(); // Get mutation state
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      description: "",
      amount: 0,
      date: new Date(),
    },
  });

  const handleSubmit = async (values: TransactionFormValues) => {
     // No need to add userId here, the page component handles it
     await onSubmit(values);
     // Toast is handled by the page component/action now
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isMutating}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="income">
                        <div className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-green-500" /> Income
                        </div>
                    </SelectItem>
                    <SelectItem value="expense">
                        <div className="flex items-center gap-2">
                            <MinusCircle className="h-4 w-4 text-red-500" /> Expense
                        </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / Category</FormLabel>
              <FormControl>
                <Input
                  placeholder={form.watch('type') === 'income' ? "Source (e.g., Sales, Services)" : "Category (e.g., Rent, Supplies)"}
                  {...field}
                  disabled={isMutating}
                 />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} disabled={isMutating}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                       disabled={isMutating}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01") || isMutating
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
         <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isMutating}>
            {isMutating ? 'Adding...' : 'Add Transaction'}
        </Button>
      </form>
    </Form>
  );
}
