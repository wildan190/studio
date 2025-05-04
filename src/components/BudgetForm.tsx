
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Budget, BudgetPeriod } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext"; // Import context

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Budget amount must be positive"),
  period: z.enum(["monthly", "yearly"], { required_error: "Period is required" }),
});

type BudgetFormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
   // The onSubmit now expects the raw form data. The page component will add the userId.
  onSubmit: (data: BudgetFormValues) => Promise<void> | void;
  existingCategories?: string[];
}

export function BudgetForm({ onSubmit, existingCategories = [] }: BudgetFormProps) {
   const { isMutating } = useAppContext(); // Get mutation state
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      amount: 0,
      period: "monthly",
    },
  });

  const handleSubmit = async (values: BudgetFormValues) => {
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Rent, Supplies, Marketing" {...field} disabled={isMutating} />
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
              <FormLabel>Budget Amount (IDR)</FormLabel>
              <FormControl>
                <Input type="number" step="1" placeholder="0" {...field} disabled={isMutating}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isMutating}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select budget period" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isMutating}>
             {isMutating ? 'Saving...' : 'Save Budget'}
         </Button>
      </form>
    </Form>
  );
}
