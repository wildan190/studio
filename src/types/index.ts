export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string; // Source for income, Category for expense
  amount: number;
  date: Date;
  // Optional: user_id if needed on the client, but usually handled server-side
  // user_id?: string;
}

export type BudgetPeriod = 'monthly' | 'yearly'; // Add more periods as needed

export interface Budget {
  id: string;
  category: string; // Matches expense transaction description/category
  amount: number;
  period: BudgetPeriod;
   // Optional: user_id if needed on the client
  // user_id?: string;
}

// --- User Management Types ---
export type Role = 'superadmin' | 'user'; // Define available roles

export interface User {
  id: string;
  username: string;
  // Client-side User object should NOT contain the password hash
  passwordHash?: string; // Make optional or remove completely for client-side type
  role: Role;
  // Permissions are stored as JSON in DB, but represented as string array here
  permissions: string[];
}
