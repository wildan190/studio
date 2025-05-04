
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Transaction, Budget, User, Role } from '@/types'; // Use application-defined types
import { toast } from '@/hooks/use-toast';
import { MANAGEABLE_PATHS, DEFAULT_ALLOWED_PATHS } from '@/lib/constants';

// Import Server Actions (assuming they now use Prisma)
import { getTransactionsAction, addTransactionAction, deleteTransactionAction } from '@/actions/transactions';
import { getBudgetsAction, addOrUpdateBudgetAction, deleteBudgetAction } from '@/actions/budgets';
import { getUsersAction, getUserForAuthAction, addUserAction, updateUserAction, deleteUserAction, updateUserPermissionsAction, verifyPassword } from '@/actions/users';

// Type for update data (password optional) - Ensure 'role' uses the correct Role enum if imported
type UserUpdateData = Partial<Pick<User, 'username' | 'role'>> & { password?: string };

// Adjust input types for actions if they changed with Prisma
type AddTransactionInputContext = Omit<Transaction, 'id'> & { userId: string };
// Ensure AddBudgetInputContext includes dueDate (make it optional/nullable)
type AddBudgetInputContext = Omit<Budget, 'id'> & { userId: string; dueDate?: Date | null };
type AddUserInputContext = Omit<User, 'id' | 'passwordHash' | 'permissions'> & { password: string };

interface AppContextProps {
  transactions: Transaction[];
  budgets: Budget[];
  users: User[]; // User list for superadmin
  currentUser: User | null;
  isLoading: boolean; // Loading state for initial data fetch
  isMutating: boolean; // Pending state for mutations
  handleAddTransaction: (data: AddTransactionInputContext) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleAddBudget: (data: AddBudgetInputContext) => Promise<void>;
  handleDeleteBudget: (id: string) => Promise<void>;
  login: (username: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => void;
  addUser: (data: AddUserInputContext) => Promise<boolean>; // Use context-specific input type
  updateUser: (id: string, data: UserUpdateData) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  updateUserPermissions: (userId: string, permissions: string[]) => Promise<boolean>;
  isClient: boolean;
  authChecked: boolean;
  fetchData: () => Promise<void>; // Expose function to refetch data
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect 1: Initial Auth Check and Data Load
  const fetchData = useCallback(async (userId?: string, userRole?: Role) => { // Pass role too
      setIsLoading(true);
      console.log(`AppContext: Fetching data for user ${userId}, Role: ${userRole}`);
      try {
        if (userId) {
            const fetchPromises: [Promise<Transaction[]>, Promise<Budget[]>, Promise<User[]>] = [
                getTransactionsAction(userId),
                getBudgetsAction(userId),
                userRole === 'superadmin' ? getUsersAction() : Promise.resolve([]), // Fetch users only if superadmin
            ];
            const [fetchedTransactions, fetchedBudgets, fetchedUsers] = await Promise.all(fetchPromises);

            // Ensure dates are Date objects
            setTransactions(fetchedTransactions.map(t => ({ ...t, date: new Date(t.date) })));
             setBudgets(fetchedBudgets.map(b => ({ ...b, dueDate: b.dueDate ? new Date(b.dueDate) : null }))); // Map dueDate
            setUsers(fetchedUsers); // Contains users only if admin fetched them

            console.log(`AppContext: Data fetched. T: ${fetchedTransactions.length}, B: ${fetchedBudgets.length}, U: ${fetchedUsers.length}`);

        } else {
            // Clear data if no user is logged in
            setTransactions([]);
            setBudgets([]);
            setUsers([]);
            console.log("AppContext: No user ID provided, clearing data.");
        }
      } catch (error) {
        console.error("AppContext: Failed to fetch initial data:", error);
        toast({ title: "Error", description: "Could not load data. Please try again later.", variant: "destructive" });
        setTransactions([]);
        setBudgets([]);
        setUsers([]);
      } finally {
        setIsLoading(false);
        console.log("AppContext: Fetch data finished, isLoading set to false.");
      }
  }, []); // Removed currentUser dependency, pass userId/role explicitly


  useEffect(() => {
    if (!isClient || authChecked) return; // Run only once after client mount if auth not checked

    const checkAuth = async () => {
        console.log("AppContext: Checking authentication status...");
        setIsLoading(true);
        let user: User | null = null;
        // Renamed key to avoid conflict with previous attempts
        const storedUserDetails = sessionStorage.getItem("bizflow_currentUser_details");

        if (storedUserDetails) {
            try {
                const parsedUser = JSON.parse(storedUserDetails) as User;
                if (parsedUser && parsedUser.id && parsedUser.username && parsedUser.role) {
                    // Assign permissions based on role if not present (backward compatibility)
                    const permissions = parsedUser.permissions || (parsedUser.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS);
                    user = { ...parsedUser, permissions };
                    console.log(`AppContext: User found in session: ${user.username} (Role: ${user.role})`);
                } else {
                    console.warn("AppContext: Invalid user data in session storage.");
                    sessionStorage.removeItem("bizflow_currentUser_details");
                }
            } catch (error) {
                console.error("AppContext: Error parsing user session details:", error);
                sessionStorage.removeItem("bizflow_currentUser_details");
            }
        } else {
            console.log("AppContext: No user details in session storage.");
        }

        setCurrentUser(user);
        setAuthChecked(true); // Mark auth check complete
        console.log("AppContext: Auth check complete. Current user:", user?.username ?? 'None');

        if (user) {
            await fetchData(user.id, user.role);
        } else {
            setIsLoading(false);
        }
    };

    checkAuth();

  }, [isClient, authChecked, fetchData]); // Dependencies: isClient, authChecked, fetchData


    // Effect 2: Redirect Logic - Runs after auth state is potentially set
    useEffect(() => {
        // Wait for client-side and initial auth check to complete
        if (!isClient || !authChecked) return;

        const publicPaths = ['/login'];
        const pathIsPublic = publicPaths.includes(pathname);
        const pathIsUsers = pathname.startsWith('/users');
        const pathIsCalendar = pathname.startsWith('/calendar'); // Check for calendar path

        console.log(`AppContext Redirect Check: Path=${pathname}, Public=${pathIsPublic}, User=${currentUser?.username}, Role=${currentUser?.role}, AuthChecked=${authChecked}`);

        if (!currentUser && !pathIsPublic) {
            console.log("AppContext: Redirecting to login (not logged in, private path).");
            router.push('/login');
        } else if (currentUser && pathIsPublic) {
             console.log("AppContext: Redirecting to dashboard (logged in, public path).");
            router.push('/');
        } else if (currentUser && pathIsUsers && currentUser.role !== 'superadmin') {
            console.log("AppContext: Redirecting to dashboard (attempting to access /users without superadmin role).");
             toast({ title: "Access Denied", description: "You do not have permission to access the User Management page.", variant: "destructive"});
            router.push('/');
        } else if (currentUser && pathIsCalendar && !(currentUser.role === 'superadmin' || currentUser.permissions?.includes('/calendar'))) {
            // Redirect if trying to access calendar without permission
            console.log("AppContext: Redirecting to dashboard (attempting to access /calendar without permission).");
            toast({ title: "Access Denied", description: "You do not have permission to access the Calendar page.", variant: "destructive"});
            router.push('/');
        }
        // Other specific page permission checks are handled in ClientLayout

    }, [isClient, authChecked, currentUser, pathname, router]);


  // --- Auth Functions ---
  const login = useCallback(async (username: string, passwordAttempt: string): Promise<boolean> => {
    let success = false; // Variable to track success
    startTransition(async () => { // Wrap in transition
        try {
          console.log(`AppContext: Attempting login for user: ${username}`);
          const userWithHash = await getUserForAuthAction(username); // Action now uses Prisma

          if (userWithHash && userWithHash.passwordHash) {
            const isValid = await verifyPassword(passwordAttempt, userWithHash.passwordHash);
            if (isValid) {
              // Exclude password hash before storing/setting state
              const { passwordHash, ...userToStore } = userWithHash;
              // Ensure permissions are set correctly
              const permissions = userToStore.permissions || (userToStore.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS);
              const finalUser = { ...userToStore, permissions };

              console.log(`AppContext: Login successful for ${username}. Storing user details.`);
              setCurrentUser(finalUser);
              // Store necessary details in session storage
              sessionStorage.setItem("bizflow_currentUser_details", JSON.stringify(finalUser));
              toast({ title: "Login Successful", description: `Welcome back, ${finalUser.username}!` });
              setAuthChecked(true); // Mark auth as checked
              await fetchData(finalUser.id, finalUser.role); // Fetch data for the logged-in user
              router.push('/'); // Redirect after state update and data fetch attempt
              success = true; // Set success to true
            } else {
                 console.warn(`AppContext: Invalid password for user: ${username}`);
                 toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
                 setCurrentUser(null);
                 sessionStorage.removeItem("bizflow_currentUser_details");
                 setAuthChecked(true);
                 setTransactions([]); setBudgets([]); setUsers([]);
                 success = false;
            }
          } else {
             console.warn(`AppContext: User not found: ${username}`);
             toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
             setCurrentUser(null);
             sessionStorage.removeItem("bizflow_currentUser_details");
             setAuthChecked(true);
             setTransactions([]); setBudgets([]); setUsers([]);
             success = false;
          }
        } catch (error) {
          console.error("AppContext: Login error:", error);
          toast({ title: "Login Error", description: "An unexpected error occurred during login.", variant: "destructive" });
          setCurrentUser(null);
          sessionStorage.removeItem("bizflow_currentUser_details");
          setAuthChecked(true);
           setTransactions([]); setBudgets([]); setUsers([]);
           success = false;
        }
    });
    // The promise now resolves based on the success variable, but be aware of the async nature of startTransition
    // This might not perfectly reflect the *instant* result, but indicates intent.
    return Promise.resolve(success);
  }, [router, fetchData]);

  const logout = useCallback(() => {
     console.log("AppContext: Logging out user.");
    setCurrentUser(null);
    sessionStorage.removeItem("bizflow_currentUser_details");
    setTransactions([]);
    setBudgets([]);
    setUsers([]);
    setAuthChecked(false); // Reset auth check status
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login'); // Redirect immediately
  }, [router]);

  // --- Data Mutation Functions ---

    const handleAddTransaction = useCallback(async (data: AddTransactionInputContext) => {
         if (!currentUser) {
             toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
             return;
         }
         startTransition(async () => {
            try {
                console.log("AppContext: Adding transaction...", data);
                 // Ensure date is a Date object when calling the action
                 const transactionData = {
                     ...data,
                     date: typeof data.date === 'string' ? new Date(data.date) : data.date,
                     userId: currentUser.id
                 };
                 const newTransaction = await addTransactionAction(transactionData); // Action uses Prisma
                 // Ensure the date in the returned object is also a Date object
                 const mappedTransaction = { ...newTransaction, date: new Date(newTransaction.date) };
                 setTransactions(prev => [mappedTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                 toast({ title: "Transaction Added", description: `${data.type === 'income' ? 'Income' : 'Expense'} recorded.` });
                 console.log("AppContext: Transaction added successfully.");
            } catch (error) {
                console.error("AppContext: Failed to add transaction:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not add transaction.", variant: "destructive" });
            }
         });
     }, [currentUser]);

    const handleDeleteTransaction = useCallback(async (id: string) => {
        if (!currentUser) {
            toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
            return;
        }
        startTransition(async () => {
            const originalTransactions = transactions;
            setTransactions(prev => prev.filter(t => t.id !== id));
            try {
                console.log(`AppContext: Deleting transaction ${id} for user ${currentUser.id}`);
                await deleteTransactionAction(id, currentUser.id); // Action uses Prisma
                toast({ title: "Transaction Deleted", variant: "destructive" });
                console.log("AppContext: Transaction deleted successfully.");
            } catch (error) {
                console.error("AppContext: Failed to delete transaction:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete transaction.", variant: "destructive" });
                setTransactions(originalTransactions);
            }
        });
    }, [currentUser, transactions]);


    const handleAddBudget = useCallback(async (data: AddBudgetInputContext) => {
       if (!currentUser) {
           toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
           return;
       }
       startTransition(async () => {
          try {
              console.log("AppContext: Adding/Updating budget...", data);
               // Ensure dueDate is passed correctly (can be null)
              const budgetData = {
                    ...data,
                    dueDate: data.dueDate ? new Date(data.dueDate) : null, // Handle potential string/date and null
                    userId: currentUser.id
                };
              const upsertedBudget = await addOrUpdateBudgetAction(budgetData); // Action uses Prisma
                // Ensure returned dueDate is also a Date object or null
              const mappedBudget = { ...upsertedBudget, dueDate: upsertedBudget.dueDate ? new Date(upsertedBudget.dueDate) : null };
              setBudgets(prevBudgets => {
                   const index = prevBudgets.findIndex(b => b.category.toLowerCase() === mappedBudget.category.toLowerCase() && b.period === mappedBudget.period);
                    if (index !== -1) {
                        const updated = [...prevBudgets];
                        updated[index] = mappedBudget;
                        return updated.sort((a, b) => a.category.localeCompare(b.category));
                    } else {
                         return [...prevBudgets, mappedBudget].sort((a, b) => a.category.localeCompare(b.category));
                    }
               });
               toast({ title: "Budget Saved", description: `Budget for ${mappedBudget.category} saved.` });
               console.log("AppContext: Budget saved successfully.");
          } catch (error) {
              console.error("AppContext: Failed to save budget:", error);
              toast({ title: "Error", description: error instanceof Error ? error.message : "Could not save budget.", variant: "destructive" });
          }
       });
   }, [currentUser]);


    const handleDeleteBudget = useCallback(async (id: string) => {
       if (!currentUser) {
           toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
           return;
       }
        startTransition(async () => {
            const originalBudgets = budgets;
            setBudgets(prev => prev.filter(b => b.id !== id));
            try {
                 console.log(`AppContext: Deleting budget ${id} for user ${currentUser.id}`);
                 await deleteBudgetAction(id, currentUser.id); // Action uses Prisma
                 toast({ title: "Budget Deleted", variant: "destructive" });
                 console.log("AppContext: Budget deleted successfully.");
                 // Revalidate paths including calendar in the server action
            } catch (error) {
                console.error("AppContext: Failed to delete budget:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete budget.", variant: "destructive" });
                setBudgets(originalBudgets);
            }
        });
    }, [currentUser, budgets]);

    // --- User Management Functions (Superadmin only) ---

    const addUser = useCallback(async (data: AddUserInputContext): Promise<boolean> => {
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can add users.", variant: "destructive"});
            return false;
        }
        let success = false;
        await startTransition(async () => { // await the transition itself if needed
            try {
                 console.log("AppContext: Adding user...", data.username);
                 const newUser = await addUserAction(data); // Action uses Prisma
                 // Ensure the returned user (without hash) has correct type
                 setUsers(prev => [...prev, newUser].sort((a, b) => a.username.localeCompare(b.username)));
                 toast({ title: "User Added", description: `User ${newUser.username} created.` });
                 console.log("AppContext: User added successfully.");
                 success = true;
            } catch (error) {
                console.error("AppContext: Failed to add user:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not add user.", variant: "destructive" });
                success = false;
            }
        });
         return success; // Return result after transition completes
    }, [currentUser]);


    const updateUser = useCallback(async (id: string, data: UserUpdateData): Promise<boolean> => {
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can update users.", variant: "destructive"});
            return false;
        }
        let success = false;
         await startTransition(async () => {
             const originalUsers = [...users];
             let updatedUserOptimistic: User | undefined;
             setUsers(prev => {
                const index = prev.findIndex(u => u.id === id);
                if (index === -1) return prev;
                const updated = [...prev];
                const originalUser = updated[index];
                updatedUserOptimistic = {
                   ...originalUser,
                   username: data.username ?? originalUser.username,
                   role: data.role ?? originalUser.role,
                   permissions: (data.role && data.role !== originalUser.role)
                    ? (data.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS)
                    : originalUser.permissions,
                };
                updated[index] = updatedUserOptimistic;
                return updated.sort((a, b) => a.username.localeCompare(b.username));
             });

             try {
                 console.log(`AppContext: Updating user ${id}...`, data);
                 await updateUserAction(id, data); // Action uses Prisma
                 toast({ title: "User Updated", description: `User ${data.username ?? updatedUserOptimistic?.username} updated.` });

                 // If the current user was updated, refresh their state and session
                 if (currentUser?.id === id && updatedUserOptimistic) {
                     console.log("AppContext: Current user updated, refreshing state and session.");
                     setCurrentUser(updatedUserOptimistic);
                     sessionStorage.setItem("bizflow_currentUser_details", JSON.stringify(updatedUserOptimistic));
                     // Optionally refetch all data if role/permissions changed significantly
                     // await fetchData(updatedUserOptimistic.id, updatedUserOptimistic.role);
                 }
                  console.log("AppContext: User updated successfully.");
                  success = true;
             } catch (error) {
                 console.error("AppContext: Failed to update user:", error);
                 toast({ title: "Error", description: error instanceof Error ? error.message : "Could not update user.", variant: "destructive" });
                 setUsers(originalUsers); // Revert
                 success = false;
             }
         });
         return success;
    }, [currentUser, users]);


    const deleteUser = useCallback(async (id: string): Promise<boolean> => {
        if (!currentUser || currentUser.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can delete users.", variant: "destructive"});
            return false;
        }
        if (id === currentUser.id) {
             toast({ title: "Error", description: "Cannot delete your own account.", variant: "destructive"});
             return false;
        }
        let success = false;
        await startTransition(async () => {
            const originalUsers = users;
            const userToDelete = users.find(u => u.id === id);
            setUsers(prev => prev.filter(u => u.id !== id));
            try {
                 console.log(`AppContext: Deleting user ${id} (${userToDelete?.username})`);
                 await deleteUserAction(id, currentUser.id); // Action uses Prisma
                 toast({ title: "User Deleted", description: `User ${userToDelete?.username} deleted.`, variant: "destructive" });
                 console.log("AppContext: User deleted successfully.");
                 success = true;
            } catch (error) {
                console.error("AppContext: Failed to delete user:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete user.", variant: "destructive" });
                setUsers(originalUsers); // Revert
                success = false;
            }
        });
         return success;
    }, [currentUser, users]);


    const updateUserPermissions = useCallback(async (userId: string, permissions: string[]): Promise<boolean> => {
         if (!currentUser || currentUser.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can change permissions.", variant: "destructive"});
            return false;
        }
        let success = false;
        await startTransition(async () => {
            const originalUsers = [...users];
             let updatedUserOptimistic: User | undefined;
             setUsers(prev => {
                const index = prev.findIndex(u => u.id === userId);
                if (index === -1) return prev;
                const updated = [...prev];
                 updatedUserOptimistic = { ...updated[index], permissions };
                 updated[index] = updatedUserOptimistic;
                return updated.sort((a, b) => a.username.localeCompare(b.username));
             });

            try {
                 console.log(`AppContext: Updating permissions for user ${userId}...`, permissions);
                 await updateUserPermissionsAction(userId, permissions); // Action uses Prisma
                 toast({ title: "Permissions Updated", description: `Permissions for user ${updatedUserOptimistic?.username} updated.` });

                 // Update current user state if they were the one modified
                 if (currentUser?.id === userId && updatedUserOptimistic) {
                     console.log("AppContext: Current user permissions updated, refreshing state and session.");
                     setCurrentUser(updatedUserOptimistic);
                      sessionStorage.setItem("bizflow_currentUser_details", JSON.stringify(updatedUserOptimistic));
                 }
                 console.log("AppContext: Permissions updated successfully.");
                 success = true;
            } catch (error) {
                console.error("AppContext: Failed to update permissions:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not update permissions.", variant: "destructive" });
                setUsers(originalUsers); // Revert
                success = false;
            }
        });
        return success;
    }, [currentUser, users]);


  const value = {
    transactions,
    budgets,
    users,
    currentUser,
    // isLoading should reflect both initial data load AND auth check completion
    isLoading: !authChecked || isLoading || isPending,
    isMutating: isPending,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    updateUserPermissions,
    handleAddTransaction,
    handleDeleteTransaction,
    handleAddBudget,
    handleDeleteBudget,
    isClient,
    authChecked,
    fetchData: () => fetchData(currentUser?.id, currentUser?.role), // Allow manual refetch
  };

  return (
    <AppContext.Provider value={value}>
       {children}
       {/* Optionally show a global loading indicator based on isLoading */}
       {/* {value.isLoading && <GlobalLoadingIndicator />} */}
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
