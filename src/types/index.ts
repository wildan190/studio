export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string; // Source for income, Category for expense
  amount: number;
  date: Date;
}

export type BudgetPeriod = 'monthly' | 'yearly'; // Add more periods as needed

export interface Budget {
  id: string;
  category: string; // Matches expense transaction description/category
  amount: number;
  period: BudgetPeriod;
}
