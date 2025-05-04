"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
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
import { ChartTooltipContent } from "@/components/ui/chart";
import type { Transaction } from "@/types";

interface CashFlowSummaryProps {
  transactions: Transaction[];
}

type Period = "daily" | "weekly" | "monthly" | "yearly";

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

  // Prepare data for the chart (simple income vs expense for the period)
  const chartData = [
    { name: "Income", value: totalIncome, fill: "hsl(var(--chart-1))" }, // Teal
    { name: "Expenses", value: totalExpenses, fill: "hsl(var(--destructive))" }, // Red
  ];

  const formatCurrency = (value: number) => {
        return value.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });
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
          <div className="p-4 bg-green-100 rounded-md">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 bg-red-100 rounded-md">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`p-4 rounded-md ${netCashFlow >= 0 ? 'bg-teal-100' : 'bg-gray-200'}`}>
            <p className="text-sm text-muted-foreground">Net Cash Flow</p>
            <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-teal-700' : 'text-gray-700'}`}>
                {formatCurrency(netCashFlow)}
            </p>
          </div>
        </div>

        {/* Chart */}
        {filteredTransactions.length > 0 && (
            <div className="h-[200px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)}/>
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={<ChartTooltipContent formatter={formatCurrency} hideLabel />}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
