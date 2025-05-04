
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { v4 as uuidv4 } from 'uuid';
import type { Transaction, Budget } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';

// Define a state to hold the dynamically imported uuid function
let generateUuid: typeof uuidv4 | null = null;

interface AppContextProps {
  transactions: Transaction[];
  budgets: Budget[];
  handleAddTransaction: (data: Omit<Transaction, 'id'>) => void;
  handleDeleteTransaction: (id: string) => void;
  handleAddBudget: (data: Omit<Budget, 'id'>) => void;
  handleDeleteBudget: (id: string) => void;
  isClient: boolean; // Add flag to indicate client-side readiness
  uuidLoaded: boolean; // Add flag to indicate uuid readiness
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("bizflow_transactions", []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>("bizflow_budgets", []);
  const [isClient, setIsClient] = useState(false);
  const [uuidLoaded, setUuidLoaded] = useState(false);

  // Dynamically import uuid on component mount (client-side only)
  useEffect(() => {
    setIsClient(true);
    import('uuid')
      .then((uuidModule) => {
        generateUuid = uuidModule.v4;
        setUuidLoaded(true);
        console.log("UUID loaded successfully");
      })
      .catch(err => {
          console.error("Failed to load uuid", err);
          toast({ title: "Error", description: "Failed to load essential components. Please refresh.", variant: "destructive"});
      });
  }, []);

  const handleAddTransaction = useCallback((data: Omit<Transaction, 'id'>) => {
    if (!generateUuid) {
      console.error("UUID generation function not loaded");
      toast({ title: "Error", description: "Could not add transaction. Please try again.", variant: "destructive"});
      return;
    }
    const newTransaction: Transaction = {
      ...data,
      id: generateUuid(),
      date: new Date(data.date), // Ensure date is a Date object
    };
    setTransactions(prevTransactions =>
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Sort by date desc
    );
    toast({
      title: "Transaction Added",
      description: `${data.type === 'income' ? 'Income' : 'Expense'} of ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} recorded.`,
    });
  }, [setTransactions]); // Dependency on setTransactions

  const handleDeleteTransaction = useCallback((id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    setTransactions(transactions.filter((t) => t.id !== id));
    if (transactionToDelete) {
       toast({
         title: "Transaction Deleted",
         description: `Transaction "${transactionToDelete.description}" removed.`,
         variant: "destructive",
       });
    }
  }, [transactions, setTransactions]); // Dependency on transactions and setTransactions

 const handleAddBudget = useCallback((data: Omit<Budget, 'id'>) => {
     if (!generateUuid) {
       console.error("UUID generation function not loaded");
       toast({ title: "Error", description: "Could not save budget. Please try again.", variant: "destructive"});
       return;
     }
     // Case-insensitive check for existing budget
     const dataCategoryLower = data.category.toLowerCase();
     const existingBudget = budgets.find(b =>
       b.category.toLowerCase() === dataCategoryLower && b.period === data.period
     );

     if (existingBudget) {
       // Update existing budget
       const updatedBudgets = budgets.map(b =>
         b.id === existingBudget.id ? { ...b, amount: data.amount, category: data.category } : b // Update amount and potentially casing of category
       );
       setBudgets(updatedBudgets);
        toast({
           title: "Budget Updated",
           description: `Budget for ${data.category} (${data.period}) updated to ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}.`,
         });
     } else {
       // Add new budget
       const newBudget: Budget = {
         ...data,
         id: generateUuid(),
       };
       setBudgets(prevBudgets =>
         [...prevBudgets, newBudget].sort((a, b) => a.category.localeCompare(b.category))
        );
        toast({
            title: "Budget Added",
            description: `Budget for ${data.category} (${data.period}) set to ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}.`,
          });
     }
   }, [budgets, setBudgets]); // Dependency on budgets and setBudgets

  const handleDeleteBudget = useCallback((id: string) => {
    const budgetToDelete = budgets.find(b => b.id === id);
    setBudgets(budgets.filter((b) => b.id !== id));
     if (budgetToDelete) {
        toast({
            title: "Budget Deleted",
            description: `Budget for ${budgetToDelete.category} (${budgetToDelete.period}) removed.`,
            variant: "destructive",
        });
    }
  }, [budgets, setBudgets]); // Dependency on budgets and setBudgets

  const value = {
    transactions,
    budgets,
    handleAddTransaction,
    handleDeleteTransaction,
    handleAddBudget,
    handleDeleteBudget,
    isClient,
    uuidLoaded,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

