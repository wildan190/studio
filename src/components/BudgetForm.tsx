
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

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Budget amount must be positive"),
  period: z.enum(["monthly", "yearly"], { required_error: "Period is required" }),
});

type BudgetFormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
  onSubmit: (data: Omit<Budget, 'id'>) => void;
  existingCategories?: string[]; // Optional: for suggesting categories or preventing duplicates in certain modes
}

export function BudgetForm({ onSubmit, existingCategories = [] }: BudgetFormProps) {
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      amount: 0,
      period: "monthly",
    },
  });

  const handleSubmit = (values: BudgetFormValues) => {
    onSubmit(values);
    toast({
        title: "Budget Saved",
        description: `Budget for ${values.category} (${values.period}) has been saved.`,
      });
    form.reset(); // Reset form after successful submission
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
                <Input placeholder="e.g., Rent, Supplies, Marketing" {...field} />
                {/* Consider adding suggestions based on existing transaction descriptions */}
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
                <Input type="number" step="1" placeholder="0" {...field} />
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
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select budget period" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        {/* Add other periods like 'quarterly' if needed */}
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Save Budget</Button>
      </form>
    </Form>
  );
}
