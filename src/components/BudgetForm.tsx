
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { Budget, BudgetPeriod } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext"; // Import context
import { cn } from "@/lib/utils";

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Budget amount must be positive"),
  period: z.enum(["monthly", "yearly"], { required_error: "Period is required" }),
  dueDate: z.date().optional().nullable(), // Add dueDate, allow null
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
      dueDate: null, // Initialize dueDate as null
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

         <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Due Date (Optional)</FormLabel>
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
                            <span>Pick a due date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value || undefined} // Pass undefined if null
                        onSelect={(date) => field.onChange(date || null)} // Set to null if date is cleared
                        disabled={(date) => date < new Date("1900-01-01") || isMutating}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                 <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs self-start text-muted-foreground"
                    onClick={() => field.onChange(null)} // Add button to clear the date
                    disabled={isMutating || !field.value}
                >
                    Clear Date
                 </Button>
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
