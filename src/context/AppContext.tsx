"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter and usePathname
import type { v4 as uuidv4 } from 'uuid';
import type { Transaction, Budget, User, Role } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';

// Define a state to hold the dynamically imported uuid function
let generateUuid: typeof uuidv4 | null = null;

interface AppContextProps {
  transactions: Transaction[];
  budgets: Budget[];
  users: User[]; // Add users state
  currentUser: User | null; // Add currentUser state
  handleAddTransaction: (data: Omit<Transaction, 'id'>) => void;
  handleDeleteTransaction: (id: string) => void;
  handleAddBudget: (data: Omit<Budget, 'id'>) => void;
  handleDeleteBudget: (id: string) => void;
  login: (username: string, passwordAttempt: string) => boolean; // Add login function
  logout: () => void; // Add logout function
  addUser: (data: Omit<User, 'id' | 'passwordHash'> & {password: string}) => boolean; // Add addUser function (Admin only)
  // TODO: Add functions for updating/deleting users and managing roles (Admin only)
  isClient: boolean; // Flag to indicate client-side readiness
  uuidLoaded: boolean; // Flag to indicate uuid readiness
  authChecked: boolean; // Flag to indicate initial auth check completed
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// !! WARNING: Storing user data, especially credentials (even "hashed" ones here),
// !! in local storage is highly insecure and NOT suitable for production.
// !! This is for demonstration purposes ONLY. Use a proper backend authentication system.
const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Password123"; // !! Extremely insecure

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>("bizflow_transactions", []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>("bizflow_budgets", []);
  const [users, setUsers] = useLocalStorage<User[]>("bizflow_users", []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [uuidLoaded, setUuidLoaded] = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // Track initial auth check
  const router = useRouter();
  const pathname = usePathname();

  // Dynamically import uuid
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

  // Seed Admin User & Check Session on Mount
  useEffect(() => {
    if (!isClient || !generateUuid) return; // Wait for client and uuid

    // Seed initial admin user if none exist
    if (users.length === 0) {
       console.log("Seeding initial admin user...");
       const adminUser: User = {
         id: generateUuid(),
         username: ADMIN_USERNAME,
         // !! Storing plaintext password directly. EXTREMELY INSECURE.
         // !! In a real app, hash the password securely server-side before storage.
         passwordHash: ADMIN_PASSWORD,
         role: "superadmin",
       };
       setUsers([adminUser]);
       // Optionally log in the admin automatically for the very first time, or require login.
       // For simplicity here, we won't auto-login.
       console.log("Admin user seeded. Please login.");
    }

    // Check for existing session (simple check, no real session management)
    const loggedInUserId = sessionStorage.getItem("bizflow_currentUser");
    if (loggedInUserId) {
        const user = users.find(u => u.id === loggedInUserId);
        if (user) {
            setCurrentUser(user);
        } else {
            // Clear invalid session data
            sessionStorage.removeItem("bizflow_currentUser");
        }
    }
    setAuthChecked(true); // Mark initial auth check as complete

  }, [isClient, users, setUsers, generateUuid]); // Depend on isClient, users, setUsers, generateUuid

    // Redirect Logic - Runs after auth state is initially checked
    useEffect(() => {
        if (!isClient || !authChecked) return; // Wait for client-side and initial auth check

        const publicPaths = ['/login']; // Define public routes
        const pathIsPublic = publicPaths.includes(pathname);

        if (!currentUser && !pathIsPublic) {
            // If not logged in and trying to access a private page, redirect to login
            router.push('/login');
        } else if (currentUser && pathIsPublic) {
            // If logged in and trying to access a public page (like login), redirect to dashboard
            router.push('/');
        }
        // If logged in and accessing a private page, allow access (no redirect needed)
        // Add role-based redirects if necessary (e.g., redirect non-admins from /users page)
        if (currentUser?.role !== 'superadmin' && pathname === '/users') {
             toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive"});
             router.push('/'); // Redirect non-admins away from user management
        }

    }, [isClient, authChecked, currentUser, pathname, router]);


  // --- Auth Functions ---
  const login = useCallback((username: string, passwordAttempt: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    // !! WARNING: Comparing plaintext passwords. HIGHLY INSECURE.
    if (user && user.passwordHash === passwordAttempt) {
      setCurrentUser(user);
      sessionStorage.setItem("bizflow_currentUser", user.id); // Simple session persistence
      toast({ title: "Login Successful", description: `Welcome back, ${user.username}!` });
      router.push('/'); // Redirect to dashboard after login
      return true;
    } else {
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setCurrentUser(null);
      sessionStorage.removeItem("bizflow_currentUser");
      return false;
    }
  }, [users, router]); // Added router dependency

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem("bizflow_currentUser");
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); // Redirect to login page after logout
  }, [router]); // Added router dependency

    // Add User (Admin Only) - Basic Implementation
    const addUser = useCallback((data: Omit<User, 'id' | 'passwordHash'> & {password: string}): boolean => {
        if (!generateUuid) {
             toast({ title: "Error", description: "System not ready.", variant: "destructive"});
             return false;
        }
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can add users.", variant: "destructive"});
            return false;
        }
        if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
             toast({ title: "Error", description: "Username already exists.", variant: "destructive"});
            return false;
        }

        const newUser: User = {
            id: generateUuid(),
            username: data.username,
            // !! Storing plaintext password. INSECURE. Hash properly in real app.
            passwordHash: data.password,
            role: data.role,
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
        toast({ title: "User Added", description: `User ${data.username} created successfully.` });
        return true;
    }, [currentUser, users, setUsers, generateUuid]);

  // --- Transaction and Budget Functions ---
  const handleAddTransaction = useCallback((data: Omit<Transaction, 'id'>) => {
    if (!generateUuid) {
      console.error("UUID generation function not loaded");
      toast({ title: "Error", description: "Could not add transaction. Please try again.", variant: "destructive"});
      return;
    }
    const newTransaction: Transaction = {
      ...data,
      id: generateUuid(),
      date: new Date(data.date),
    };
    setTransactions(prevTransactions =>
      [...prevTransactions, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    toast({
      title: "Transaction Added",
      description: `${data.type === 'income' ? 'Income' : 'Expense'} of ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })} recorded.`,
    });
  }, [setTransactions]);

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
  }, [transactions, setTransactions]);

 const handleAddBudget = useCallback((data: Omit<Budget, 'id'>) => {
     if (!generateUuid) {
       console.error("UUID generation function not loaded");
       toast({ title: "Error", description: "Could not save budget. Please try again.", variant: "destructive"});
       return;
     }
     const dataCategoryLower = data.category.toLowerCase();
     const existingBudget = budgets.find(b =>
       b.category.toLowerCase() === dataCategoryLower && b.period === data.period
     );

     if (existingBudget) {
       const updatedBudgets = budgets.map(b =>
         b.id === existingBudget.id ? { ...b, amount: data.amount, category: data.category } : b
       );
       setBudgets(updatedBudgets);
        toast({
           title: "Budget Updated",
           description: `Budget for ${data.category} (${data.period}) updated to ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}.`,
         });
     } else {
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
   }, [budgets, setBudgets]);

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
  }, [budgets, setBudgets]);

  const value = {
    transactions,
    budgets,
    users, // Expose users
    currentUser, // Expose current user
    login, // Expose login
    logout, // Expose logout
    addUser, // Expose addUser
    handleAddTransaction,
    handleDeleteTransaction,
    handleAddBudget,
    handleDeleteBudget,
    isClient,
    uuidLoaded,
    authChecked, // Expose authChecked status
  };

  // Render children only after initial auth check is complete
  // or if on a public path (like login)
  const publicPaths = ['/login']; // Define public routes
  const showContent = authChecked || publicPaths.includes(pathname);


  return (
    <AppContext.Provider value={value}>
      {showContent ? children : null /* Optionally show a loading spinner here */}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
