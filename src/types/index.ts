import type { Role as PrismaRole, TransactionType as PrismaTransactionType, BudgetPeriod as PrismaBudgetPeriod } from '@prisma/client';

// Use Prisma enums directly or create app-level enums that map if needed
export type TransactionType = PrismaTransactionType; // 'income' | 'expense'
export type BudgetPeriod = PrismaBudgetPeriod; // 'monthly' | 'yearly'
export type Role = PrismaRole; // 'superadmin' | 'user'

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string; // Source for income, Category for expense
  amount: number; // Use number in the application type (converted from Decimal)
  date: Date;
  // userId is usually not needed directly on the client transaction object
  // userId?: string;
}

export interface Budget {
  id: string;
  category: string; // Matches expense transaction description/category
  amount: number; // Use number in the application type (converted from Decimal)
  period: BudgetPeriod;
  dueDate?: Date | null; // Optional due date, map from DateTime?
   // userId is usually not needed directly on the client budget object
  // userId?: string;
}

// --- User Management Types ---

export interface User {
  id: string;
  username: string;
  // Client-side User object should NOT contain the password hash
  passwordHash?: string; // Internal representation, ensure it's not sent to client unless needed (e.g., for auth check ONLY)
  role: Role;
  // Permissions are stored as JSON in DB, but represented as string array here
  permissions: string[];
}
