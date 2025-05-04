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

// --- User Management Types ---
export type Role = 'superadmin' | 'user'; // Define available roles

export interface User {
  id: string;
  username: string;
  // !! In a real application, NEVER store passwords like this.
  // !! Passwords should be securely hashed on a server.
  passwordHash: string; // For demo purposes, storing plaintext/simple hash
  role: Role;
  permissions: string[]; // Array of allowed route paths (e.g., '/', '/transactions')
}
