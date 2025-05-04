
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Transaction, Budget, User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { MANAGEABLE_PATHS, DEFAULT_ALLOWED_PATHS } from '@/lib/constants';

// Import Server Actions
import { getTransactionsAction, addTransactionAction, deleteTransactionAction } from '@/actions/transactions';
import { getBudgetsAction, addOrUpdateBudgetAction, deleteBudgetAction } from '@/actions/budgets';
import { getUsersAction, getUserForAuthAction, addUserAction, updateUserAction, deleteUserAction, updateUserPermissionsAction, verifyPassword } from '@/actions/users';

// Type for update data (password optional)
type UserUpdateData = Partial<Pick<User, 'username' | 'role'>> & { password?: string };

interface AppContextProps {
  transactions: Transaction[];
  budgets: Budget[];
  users: User[];
  currentUser: User | null;
  isLoading: boolean; // Loading state for initial data fetch
  isMutating: boolean; // Pending state for mutations
  handleAddTransaction: (data: Omit<Transaction, 'id' | 'date'> & {date: Date; userId: string}) => Promise<void>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleAddBudget: (data: Omit<Budget, 'id'> & {userId: string}) => Promise<void>;
  handleDeleteBudget: (id: string) => Promise<void>;
  login: (username: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => void;
  addUser: (data: Omit<User, 'id' | 'passwordHash' | 'permissions'> & {password: string}) => Promise<boolean>;
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
  const [users, setUsers] = useState<User[]>([]); // User list (for superadmin view)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // Track initial auth check completed
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial data
  const [isPending, startTransition] = useTransition(); // Pending state for mutations
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect 1: Initial Auth Check and Data Load
  const fetchData = useCallback(async (userId?: string) => {
      setIsLoading(true);
      try {
        // Only fetch user-specific data if a userId is provided (logged in)
        if (userId) {
            const [fetchedTransactions, fetchedBudgets, fetchedUsers] = await Promise.all([
                getTransactionsAction(userId),
                getBudgetsAction(userId),
                currentUser?.role === 'superadmin' ? getUsersAction() : Promise.resolve([]), // Fetch all users only if superadmin
            ]);
            setTransactions(fetchedTransactions);
            setBudgets(fetchedBudgets);
            if (currentUser?.role === 'superadmin') {
                setUsers(fetchedUsers);
            } else {
                setUsers([]); // Clear user list if not superadmin
            }
        } else {
            // Clear data if no user is logged in
            setTransactions([]);
            setBudgets([]);
            setUsers([]);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({ title: "Error", description: "Could not load data. Please try again later.", variant: "destructive" });
        // Clear potentially stale data on error
        setTransactions([]);
        setBudgets([]);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
  }, [currentUser?.role]); // Depend on role to refetch users if role changes


  useEffect(() => {
    if (!isClient || authChecked) return; // Run only once after client mount

    const checkAuth = async () => {
        console.log("AppContext: Checking authentication status...");
        const storedUserId = sessionStorage.getItem("bizflow_currentUser");
        let user: User | null = null;

        if (storedUserId) {
            try {
                // Instead of fetching all users, fetch just the one needed for auth check
                // NOTE: This requires a way to get user details (including role/permissions) by ID
                // If getUserForAuthAction only works by username, we might need another action getUserByIdAction
                // For now, we'll rely on fetching *after* setting currentUser temporarily based on ID presence
                console.log(`AppContext: Found user ID ${storedUserId} in session storage. Attempting to validate.`);
                // Simulate finding user - ideally fetch user data by ID here.
                // Assuming we need to refetch user details to be sure they still exist and get permissions
                 const userFromAuthCheck = sessionStorage.getItem("bizflow_currentUser_details"); // Temporary workaround
                 if (userFromAuthCheck) {
                    user = JSON.parse(userFromAuthCheck) as User;
                    console.log("AppContext: Successfully validated user from temporary storage:", user.username);
                 } else {
                     console.warn("AppContext: User ID found, but no user details in temp storage. Needs refetch/validation.");
                     // Attempt to logout if details aren't found or validation fails
                     sessionStorage.removeItem("bizflow_currentUser");
                     sessionStorage.removeItem("bizflow_currentUser_details"); // Clear temp details too
                 }

            } catch (error) {
                 console.error("AppContext: Error validating user session:", error);
                 sessionStorage.removeItem("bizflow_currentUser");
                 sessionStorage.removeItem("bizflow_currentUser_details");
            }
        }

        setCurrentUser(user); // Set user (or null)
        setAuthChecked(true); // Mark auth check as complete
        console.log("AppContext: Auth check complete. Current user:", user?.username ?? 'None');

        // Fetch initial data based on whether a user is logged in
        if (user) {
            await fetchData(user.id);
        } else {
            setIsLoading(false); // No data to fetch, stop loading
        }
    };

    checkAuth();

  }, [isClient, authChecked, fetchData]); // Run when client ready and auth not checked


    // Effect 2: Redirect Logic - Runs after auth state is set
    useEffect(() => {
        if (!isClient || !authChecked) return; // Wait for client-side and initial auth check

        const publicPaths = ['/login'];
        const pathIsPublic = publicPaths.includes(pathname);
        const pathIsUsers = pathname.startsWith('/users');

        console.log(`AppContext Redirect Check: Path=${pathname}, Public=${pathIsPublic}, User=${currentUser?.username}, Role=${currentUser?.role}`);

        if (!currentUser && !pathIsPublic) {
            console.log("AppContext: Redirecting to login (not logged in, private path).");
            router.push('/login');
        } else if (currentUser && pathIsPublic) {
             console.log("AppContext: Redirecting to dashboard (logged in, public path).");
            router.push('/');
        } else if (currentUser && pathIsUsers && currentUser.role !== 'superadmin') {
            // If logged in, trying to access /users, but not superadmin
            console.log("AppContext: Redirecting to dashboard (accessing /users without superadmin role).");
             toast({ title: "Access Denied", description: "You do not have permission to access the User Management page.", variant: "destructive"});
            router.push('/');
        }
        // Permission checks for other pages are handled in ClientLayout

    }, [isClient, authChecked, currentUser, pathname, router]);


  // --- Auth Functions ---
  const login = useCallback(async (username: string, passwordAttempt: string): Promise<boolean> => {
    try {
      const user = await getUserForAuthAction(username);
      if (user && user.passwordHash) {
        const isValid = await verifyPassword(passwordAttempt, user.passwordHash);
        if (isValid) {
          // Don't store password hash in state or session storage
          const { passwordHash, ...userToStore } = user;
          setCurrentUser(userToStore);
          sessionStorage.setItem("bizflow_currentUser", user.id);
          // Temporary workaround: Store user details needed after refresh until proper session management
          sessionStorage.setItem("bizflow_currentUser_details", JSON.stringify(userToStore));
          toast({ title: "Login Successful", description: `Welcome back, ${user.username}!` });
          setAuthChecked(true); // Ensure auth is checked after successful login attempt
          await fetchData(user.id); // Fetch data for the logged-in user
          router.push('/'); // Redirect to dashboard
          return true;
        }
      }
      toast({ title: "Login Failed", description: "Invalid username or password.", variant: "destructive" });
      setCurrentUser(null);
      sessionStorage.removeItem("bizflow_currentUser");
      sessionStorage.removeItem("bizflow_currentUser_details");
      setAuthChecked(true); // Ensure auth is checked after failed login attempt
      // Clear data on failed login
      setTransactions([]);
      setBudgets([]);
      setUsers([]);
      return false;
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Login Error", description: "An unexpected error occurred during login.", variant: "destructive" });
      setCurrentUser(null);
      sessionStorage.removeItem("bizflow_currentUser");
      sessionStorage.removeItem("bizflow_currentUser_details");
      setAuthChecked(true); // Ensure auth is checked after error
        // Clear data on error
      setTransactions([]);
      setBudgets([]);
      setUsers([]);
      return false;
    }
  }, [router, fetchData]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem("bizflow_currentUser");
    sessionStorage.removeItem("bizflow_currentUser_details");
    setTransactions([]); // Clear data
    setBudgets([]);
    setUsers([]);
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    router.push('/login');
  }, [router]);

  // --- Data Mutation Functions ---

    const handleAddTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'date'> & {date: Date; userId: string}) => {
         if (!currentUser) {
             toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
             return;
         }
         startTransition(async () => {
            try {
                // Pass the actual Date object
                 const newTransaction = await addTransactionAction({
                    ...data,
                    date: data.date, // Pass the Date object directly
                    userId: currentUser.id
                 });
                 setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
                 toast({ title: "Transaction Added", description: `${data.type === 'income' ? 'Income' : 'Expense'} recorded.` });
            } catch (error) {
                console.error("Failed to add transaction:", error);
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
            setTransactions(prev => prev.filter(t => t.id !== id)); // Optimistic update
            try {
                await deleteTransactionAction(id, currentUser.id);
                toast({ title: "Transaction Deleted", variant: "destructive" });
            } catch (error) {
                console.error("Failed to delete transaction:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete transaction.", variant: "destructive" });
                setTransactions(originalTransactions); // Revert on error
            }
        });
    }, [currentUser, transactions]);


    const handleAddBudget = useCallback(async (data: Omit<Budget, 'id'> & {userId: string}) => {
       if (!currentUser) {
           toast({ title: "Error", description: "You must be logged in.", variant: "destructive"});
           return;
       }
       startTransition(async () => {
          try {
              const upsertedBudget = await addOrUpdateBudgetAction({ ...data, userId: currentUser.id });
              setBudgets(prevBudgets => {
                   const index = prevBudgets.findIndex(b => b.id === upsertedBudget.id);
                    if (index !== -1) {
                        const updated = [...prevBudgets];
                        updated[index] = upsertedBudget;
                        return updated.sort((a, b) => a.category.localeCompare(b.category));
                    } else {
                        return [...prevBudgets, upsertedBudget].sort((a, b) => a.category.localeCompare(b.category));
                    }
               });
               toast({ title: "Budget Saved", description: `Budget for ${upsertedBudget.category} saved.` });
          } catch (error) {
              console.error("Failed to save budget:", error);
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
            setBudgets(prev => prev.filter(b => b.id !== id)); // Optimistic update
            try {
                 await deleteBudgetAction(id, currentUser.id);
                 toast({ title: "Budget Deleted", variant: "destructive" });
            } catch (error) {
                console.error("Failed to delete budget:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete budget.", variant: "destructive" });
                setBudgets(originalBudgets); // Revert on error
            }
        });
    }, [currentUser, budgets]);

    // --- User Management Functions (Superadmin only) ---

    const addUser = useCallback(async (data: Omit<User, 'id' | 'passwordHash' | 'permissions'> & {password: string}): Promise<boolean> => {
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can add users.", variant: "destructive"});
            return false;
        }
        let success = false;
        startTransition(async () => {
            try {
                 const newUser = await addUserAction(data);
                 setUsers(prev => [...prev, newUser]); // Add user without hash to local state
                 toast({ title: "User Added", description: `User ${newUser.username} created.` });
                 success = true;
            } catch (error) {
                console.error("Failed to add user:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not add user.", variant: "destructive" });
                success = false;
            }
        });
         // Note: Returning success immediately might not reflect the async operation's actual result.
         // Consider returning the promise or using a different pattern if the caller needs to wait.
         return success; // This might return true before the transition finishes
    }, [currentUser]);


    const updateUser = useCallback(async (id: string, data: UserUpdateData): Promise<boolean> => {
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can update users.", variant: "destructive"});
            return false;
        }
        let success = false;
         startTransition(async () => {
             const originalUsers = [...users]; // Clone for potential revert
            // Optimistic update (without password hash)
             let updatedUserOptimistic: User | undefined;
             setUsers(prev => {
                const index = prev.findIndex(u => u.id === id);
                if (index === -1) return prev;
                const updated = [...prev];
                 // Create the optimistic update object carefully, avoid modifying passwordHash
                updatedUserOptimistic = {
                   ...updated[index],
                   username: data.username ?? updated[index].username,
                   role: data.role ?? updated[index].role,
                   // If role changed, optimistically update permissions too
                   permissions: (data.role && data.role !== updated[index].role)
                    ? (data.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS)
                    : updated[index].permissions,
                };
                updated[index] = updatedUserOptimistic;
                return updated;
             });

             try {
                 await updateUserAction(id, data);
                 toast({ title: "User Updated", description: `User ${data.username ?? updatedUserOptimistic?.username} updated.` });
                 // If the current user was updated, refresh their state
                 if (currentUser?.id === id) {
                     const updatedCurrentUser = users.find(u => u.id === id); // Get updated data
                     if (updatedCurrentUser) setCurrentUser(updatedCurrentUser);
                     // Optionally refetch all data if permissions/role changed significantly
                     // await fetchData(currentUser.id);
                 }
                  success = true;
             } catch (error) {
                 console.error("Failed to update user:", error);
                 toast({ title: "Error", description: error instanceof Error ? error.message : "Could not update user.", variant: "destructive" });
                 setUsers(originalUsers); // Revert optimistic update
                 success = false;
             }
         });
         return success; // May return before async completes
    }, [currentUser, users]); // Include users for optimistic update revert


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
        startTransition(async () => {
            const originalUsers = users;
            const userToDelete = users.find(u => u.id === id);
            setUsers(prev => prev.filter(u => u.id !== id)); // Optimistic update
            try {
                 await deleteUserAction(id, currentUser.id);
                 toast({ title: "User Deleted", description: `User ${userToDelete?.username} deleted.`, variant: "destructive" });
                 success = true;
            } catch (error) {
                console.error("Failed to delete user:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete user.", variant: "destructive" });
                setUsers(originalUsers); // Revert on error
                success = false;
            }
        });
         return success; // May return before async completes
    }, [currentUser, users]);


    const updateUserPermissions = useCallback(async (userId: string, permissions: string[]): Promise<boolean> => {
         if (!currentUser || currentUser.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can change permissions.", variant: "destructive"});
            return false;
        }
        let success = false;
        startTransition(async () => {
            const originalUsers = [...users];
             // Optimistic Update
             let updatedUserOptimistic: User | undefined;
             setUsers(prev => {
                const index = prev.findIndex(u => u.id === userId);
                if (index === -1) return prev;
                const updated = [...prev];
                 updatedUserOptimistic = { ...updated[index], permissions };
                 updated[index] = updatedUserOptimistic;
                return updated;
             });

            try {
                 await updateUserPermissionsAction(userId, permissions);
                 toast({ title: "Permissions Updated", description: `Permissions for user updated.` });
                  // Update current user state if they were the one modified
                 if (currentUser?.id === userId && updatedUserOptimistic) {
                     setCurrentUser(updatedUserOptimistic);
                 }
                 success = true;
            } catch (error) {
                console.error("Failed to update permissions:", error);
                toast({ title: "Error", description: error instanceof Error ? error.message : "Could not update permissions.", variant: "destructive" });
                setUsers(originalUsers); // Revert optimistic update
                success = false;
            }
        });
        return success; // May return before async completes
    }, [currentUser, users]); // Added users dependency


  const value = {
    transactions,
    budgets,
    users,
    currentUser,
    isLoading: isLoading || isPending, // Combine initial load and mutation pending state
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
    fetchData: () => fetchData(currentUser?.id), // Function to allow manual refetch
  };

  // Show loading indicator or children
  return (
    <AppContext.Provider value={value}>
       {isClient ? children : null /* Or a global spinner */}
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
