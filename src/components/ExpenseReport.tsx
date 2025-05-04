
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend, Cell } from "recharts"; // Added Cell
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, isWithinInterval } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Transaction, Budget } from "@/types";
import { cn } from "@/lib/utils";

interface ExpenseReportProps {
  transactions: Transaction[];
  budgets: Budget[];
}

type ReportPeriod = "monthly" | "yearly";

// Define chart configuration with dynamic keys for categories
const generateChartConfig = (reportData: ReportData[]): ChartConfig => {
    const config: ChartConfig = {
        budget: { label: "Budget", color: "hsl(var(--secondary-foreground)/0.5)" },
        actual: { label: "Actual", color: "hsl(var(--primary))" }, // Default color for actual
        actual_over: { label: "Actual (Over)", color: "hsl(var(--destructive))" }, // Color for over-budget actual
    };
    return config;
};

interface ReportData {
    category: string; // Store original casing for display
    budget: number;
    actual: number;
    percentage: number;
    isOverBudget: boolean;
}


export function ExpenseReport({ transactions, budgets }: ExpenseReportProps) {
  const [period, setPeriod] = React.useState<ReportPeriod>("monthly");

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "monthly":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "yearly":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }

  // Filter transactions for the selected period and only expenses
  const filteredExpenses = transactions.filter(
    (t) => t.type === "expense" && isWithinInterval(t.date, { start: startDate, end: endDate })
  );

  // Filter budgets for the selected period and create a map for quick lookup (lowercase keys)
  const relevantBudgetsLowerMap = budgets
    .filter(b => b.period === period)
    .reduce((acc, budget) => {
      acc[budget.category.toLowerCase()] = budget; // Use lowercase category as key
      return acc;
    }, {} as Record<string, Budget>);


  // Calculate actual spending per category (using lowercase category keys)
  const actualSpendingLowerMap = filteredExpenses.reduce((acc, t) => {
    const categoryLower = t.description.toLowerCase(); // Use lowercase category
    acc[categoryLower] = (acc[categoryLower] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  // Combine budget and actual spending data
   const reportDataMap: Record<string, ReportData> = {};

   // Process budgets
   Object.values(relevantBudgetsLowerMap).forEach(budget => {
     const categoryLower = budget.category.toLowerCase();
     const actual = actualSpendingLowerMap[categoryLower] || 0;
     const percentage = budget.amount > 0 ? Math.round((actual / budget.amount) * 100) : 0;
     reportDataMap[categoryLower] = {
       category: budget.category, // Keep original casing for display
       budget: budget.amount,
       actual: actual,
       percentage: percentage,
       isOverBudget: actual > budget.amount,
     };
   });

   // Process expenses without a matching budget
   Object.entries(actualSpendingLowerMap).forEach(([categoryLower, actual]) => {
     if (!reportDataMap[categoryLower]) {
        // Find the original casing from the first transaction with this category (case-insensitive)
        const originalCategory = filteredExpenses.find(t => t.description.toLowerCase() === categoryLower)?.description || categoryLower;
        reportDataMap[categoryLower] = {
          category: originalCategory,
          budget: 0,
          actual: actual,
          percentage: 0,
          isOverBudget: actual > 0, // Over budget if any spending and no budget
        };
     }
   });

   // Convert map to array and sort
   const reportData: ReportData[] = Object.values(reportDataMap).sort((a, b) => b.actual - a.actual);


  const chartConfig = generateChartConfig(reportData);
  // Prepare data for the chart (Top N categories or all?) Let's show top 7 for visual clarity
  const chartData = reportData.slice(0, 7).map(item => ({
      name: item.category, // Use original category casing for X-axis labels
      budget: item.budget,
      actual: item.actual,
      // Use a specific fill color based on budget status
      fillActual: item.isOverBudget ? "hsl(var(--destructive))" : "hsl(var(--primary))",
      fillBudget: "hsl(var(--secondary-foreground)/0.3)",
  }));


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Expense Report</CardTitle>
             <Select value={period} onValueChange={(value: ReportPeriod) => setPeriod(value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <CardDescription>
          Budget vs Actual Spending ({period === 'monthly' ? format(now, 'MMMM yyyy') : format(now, 'yyyy')}). Comparison is case-insensitive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reportData.length > 0 ? (
          <>
            {/* Chart */}
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }} accessibilityLayer layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <YAxis
                         dataKey="name" // Display original category casing
                         type="category"
                         tickLine={false}
                         axisLine={false}
                         tickMargin={8}
                         width={100} // Adjust width as needed for longer labels
                         interval={0} // Show all labels
                         stroke="hsl(var(--foreground))"
                         fontSize={12}
                         tick={{ dy: 5 }} // Adjust vertical positioning
                     />
                     <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                     <ChartTooltip
                       cursor={{ fill: 'hsl(var(--muted))' }}
                       content={<ChartTooltipContent formatter={formatCurrency} />} // Use default formatting or customize
                     />
                   <Legend />
                   <Bar dataKey="budget" fill="var(--color-budget)" name="Budget" radius={4} barSize={15} />
                   {/* Use Cell to apply dynamic fill based on over/under budget */}
                   <Bar dataKey="actual" name="Actual" radius={4} barSize={15}>
                     {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.fillActual} /> // Use calculated fill per entry
                       ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </ChartContainer>

            {/* Detailed List */}
            <ScrollArea className="h-[350px] rounded-md border p-4">
              <div className="space-y-4">
                {reportData.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.category}</span> {/* Display original casing */}
                       <span className={cn("font-semibold", item.isOverBudget ? "text-destructive" : "text-foreground")}>
                         {formatCurrency(item.actual)}
                          {item.budget > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              / {formatCurrency(item.budget)}
                            </span>
                          )}
                       </span>
                    </div>
                    {item.budget > 0 && (
                      <Progress
                        value={item.percentage}
                        className={cn("h-2", item.isOverBudget && "[&>div]:bg-destructive")} // Custom class for over-budget progress bar
                        aria-label={`${item.category} budget progress`}
                      />
                    )}
                     {item.budget === 0 && item.actual > 0 && ( // Only show 'No budget set' if there was actual spending
                        <p className="text-xs text-muted-foreground italic text-right">No budget set</p>
                     )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-4">No expense or budget data for the selected period.</p>
        )}
      </CardContent>
    </Card>
  );
}
