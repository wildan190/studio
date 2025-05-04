
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"; // Removed Tooltip import from recharts
import { subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
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
// Import ChartTooltip along with ChartTooltipContent
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
    expenses: {
        label: "Expenses",
        color: "hsl(var(--destructive))", // Red
    },
} satisfies ChartConfig;


export function CashFlowSummary({ transactions }: CashFlowSummaryProps) {
  const [period, setPeriod] = React.useState<Period>("monthly");

  const now = new Date();
  let startDate: Date;
  let endDate: Date = endOfDay(now);

  switch (period) {
    case "daily":
      startDate = startOfDay(now);
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
    (t) => t.date >= startDate && t.date <= endDate
  );

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpenses;

  // Prepare data for the chart
  // Add key 'fill' for color and update 'name' to match chartConfig keys
  const chartData = [
    { name: "income", value: totalIncome, fill: "var(--color-income)" },
    { name: "expenses", value: totalExpenses, fill: "var(--color-expenses)" },
  ];

  const formatCurrency = (value: number) => {
        // Use Intl.NumberFormat for potentially better performance and consistency
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
          {/* Use CSS variables for background colors for better theme consistency */}
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
        {filteredTransactions.length > 0 && (
            <ChartContainer config={chartConfig} className="h-[200px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} accessibilityLayer>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        {/* Use label from chartConfig for XAxis dataKey */}
                        <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label}
                            stroke="hsl(var(--foreground))"
                            fontSize={12}
                         />
                        <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)}/>
                        {/* Use ChartTooltip from shadcn/ui instead of recharts Tooltip */}
                        <ChartTooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<ChartTooltipContent formatter={formatCurrency} nameKey="name" hideLabel />} // Pass ChartTooltipContent here
                        />
                        {/* Bar uses dataKey="value" which is defined in chartConfig */}
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        )}
         {filteredTransactions.length === 0 && (
             <p className="text-muted-foreground text-center py-4">No transaction data for the selected period.</p>
         )}

      </CardContent>
    </Card>
  );
}
