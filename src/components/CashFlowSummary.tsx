
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, isWithinInterval } from "date-fns";
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
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Transaction } from "@/types";

interface CashFlowSummaryProps {
  transactions: Transaction[];
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

// Define chart configuration
const chartConfig = {
    value: { // Corresponds to the dataKey used in the Bar component
      label: "Amount", // Generic label, tooltip content handles specific labels
    },
    income: {
        label: "Income",
        color: "hsl(var(--chart-1))", // Teal
    },
    expense: { // Changed from 'expenses' to 'expense' to match dataKey
        label: "Expenses",
        color: "hsl(var(--destructive))", // Red
    },
} satisfies ChartConfig;


export function CashFlowSummary({ transactions }: CashFlowSummaryProps) {
  const [period, setPeriod] = React.useState<Period>("monthly");

  const now = new Date();
  let startDate: Date;
  let endDate: Date; // end date is inclusive

  switch (period) {
    case "daily":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "weekly":
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
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

  const filteredTransactions = transactions.filter(
    (t) => isWithinInterval(t.date, { start: startDate, end: endDate })
  );

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpenses;

  // Prepare data for the chart
  // Use 'income' and 'expense' as keys to match chartConfig
  const chartData = [
    { name: "income", value: totalIncome, fill: "var(--color-income)" },
    { name: "expense", value: totalExpenses, fill: "var(--color-expense)" }, // Changed key to 'expense'
  ];

  const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
    }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Cash Flow Summary</CardTitle>
            <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <CardDescription>
            {`${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-[hsl(var(--chart-1)/0.1)] rounded-md">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold text-[hsl(var(--chart-1))]">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 bg-[hsl(var(--destructive)/0.1)] rounded-md">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-[hsl(var(--destructive))]">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`p-4 rounded-md ${netCashFlow >= 0 ? 'bg-[hsl(var(--primary)/0.1)]' : 'bg-muted'}`}>
            <p className="text-sm text-muted-foreground">Net Cash Flow</p>
            <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-primary' : 'text-foreground'}`}>
                {formatCurrency(netCashFlow)}
            </p>
          </div>
        </div>

        {/* Chart */}
        {filteredTransactions.length > 0 ? ( // Check if there are *any* transactions in the period
            <ChartContainer config={chartConfig} className="h-[200px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    {/* Ensure chartData is passed correctly */}
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name" // This should be 'income' or 'expense'
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            // Format tick label using chartConfig
                            tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label ?? value}
                            stroke="hsl(var(--foreground))"
                            fontSize={12}
                         />
                        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)}/>
                        <ChartTooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<ChartTooltipContent formatter={formatCurrency} nameKey="name" hideLabel />}
                        />
                        {/* Bar uses dataKey="value" which is defined in chartConfig */}
                         <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        ) : ( // Render message only if no transactions exist for the period
             <p className="text-muted-foreground text-center py-4">No transaction data for the selected period.</p>
         )}

      </CardContent>
    </Card>
  );
}
