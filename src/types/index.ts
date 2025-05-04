export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string; // Source for income, Category for expense
  amount: number;
  date: Date;
}
