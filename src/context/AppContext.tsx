
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter and usePathname
import type { v4 as uuidv4 } from 'uuid';
import type { Transaction, Budget, User, Role } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/use-toast';
import { MANAGEABLE_PATHS, DEFAULT_ALLOWED_PATHS } from '@/lib/constants'; // Import constants

// Define a state to hold the dynamically imported uuid function
let generateUuid: typeof uuidv4 | null = null;

// Type for update data (password optional)
type UserUpdateData = Partial<Pick<User, 'username' | 'role'>> & { password?: string };


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
  addUser: (data: Omit<User, 'id' | 'passwordHash' | 'permissions'> & {password: string}) => boolean;
  updateUser: (id: string, data: UserUpdateData) => boolean; // Add updateUser function
  deleteUser: (id: string) => boolean; // Add deleteUser function
  updateUserPermissions: (userId: string, permissions: string[]) => boolean; // Add permission update function
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
  const [authChecked, setAuthChecked] = useState(false); // Track initial auth check completed
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

  // Effect 1: Seed Admin User & Data Migration & Initial Auth Check
   useEffect(() => {
     if (!isClient || !generateUuid || authChecked) return; // Wait for client and uuid, run only once

     let usersModified = false; // Flag to track if users array was changed

     // Seed initial admin user if none exist
     if (users.length === 0) {
        console.log("Seeding initial admin user...");
        const adminUser: User = {
          id: generateUuid(),
          username: ADMIN_USERNAME,
          passwordHash: ADMIN_PASSWORD, // !! INSECURE !!
          role: "superadmin",
          permissions: MANAGEABLE_PATHS.map(p => p.path),
        };
        setUsers([adminUser]);
        usersModified = true; // Mark as modified
        console.log("Admin user seeded.");
     } else {
         // Ensure existing users have the permissions field (migration for older data)
         let needsMigrationUpdate = false;
         const migratedUsers = users.map(u => {
             if (!u.permissions) {
                 needsMigrationUpdate = true;
                 return {
                     ...u,
                     permissions: u.role === 'superadmin'
                         ? MANAGEABLE_PATHS.map(p => p.path)
                         : DEFAULT_ALLOWED_PATHS,
                 };
             }
             // Ensure superadmins always have full permissions after migration/load
             if (u.role === 'superadmin' && (!u.permissions || u.permissions.length !== MANAGEABLE_PATHS.length)) {
                 needsMigrationUpdate = true;
                 return { ...u, permissions: MANAGEABLE_PATHS.map(p => p.path) };
             }
             return u;
         });
         if (needsMigrationUpdate) {
             setUsers(migratedUsers);
             usersModified = true; // Mark as modified
             console.log("Migrated/verified existing users permissions field.");
         }
     }

     // Set authChecked to true *after* any potential modifications
     // This allows the next effect to run with the correct user data
     setAuthChecked(true);
     console.log("Auth check complete.");


   }, [isClient, generateUuid, users, setUsers, authChecked]); // Keep dependencies, but add authChecked guard


    // Effect 2: Check Session storage and set current user
    useEffect(() => {
        // Wait for client-side, uuid load, and initial auth check/seeding
        if (!isClient || !uuidLoaded || !authChecked) {
            return;
        }

        const loggedInUserId = sessionStorage.getItem("bizflow_currentUser");

        if (loggedInUserId) {
            const userFromStorage = users.find(u => u.id === loggedInUserId);
            if (userFromStorage) {
                // Only update state if the user is actually different or not set yet
                if (!currentUser || currentUser.id !== userFromStorage.id) {
                    // Ensure permissions are correctly set when loading from session
                    const userWithPermissions = {
                        ...userFromStorage,
                        permissions: userFromStorage.permissions || (userFromStorage.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS),
                    };
                    console.log("Setting current user from session storage:", userWithPermissions.username);
                    setCurrentUser(userWithPermissions);
                }
            } else {
                // User ID in session storage, but user doesn't exist in local storage anymore
                 if (currentUser) { // Only clear state if it's currently set
                     console.log("User ID in session storage not found in current user list. Logging out.");
                     setCurrentUser(null); // Clear current user state
                 }
                sessionStorage.removeItem("bizflow_currentUser"); // Clear invalid session storage
            }
        } else {
            // No user ID in session storage, ensure currentUser state is null
            if (currentUser) {
                console.log("No user ID in session storage. Clearing current user state.");
                setCurrentUser(null);
            }
        }

    // Depend on users array changes, auth status, and isClient status.
    // currentUser is included to correctly handle external state changes (like programmatic logout).
    }, [isClient, uuidLoaded, authChecked, users, currentUser]);



    // Effect 3: Redirect Logic - Runs after auth state is potentially updated by Effect 2
    useEffect(() => {
        if (!isClient || !authChecked) return; // Wait for client-side and initial auth check

        const publicPaths = ['/login']; // Define public routes
        const pathIsPublic = publicPaths.includes(pathname);

        if (!currentUser && !pathIsPublic) {
            // If not logged in and trying to access a private page, redirect to login
            console.log("Redirecting to login: Not logged in.");
            router.push('/login');
        } else if (currentUser && pathIsPublic) {
            // If logged in and trying to access a public page (like login), redirect to dashboard
             console.log("Redirecting to dashboard: Logged in, accessing public page.");
            router.push('/');
        }
        // Role-based redirect for /users page (handled outside this effect for immediate feedback)
        // Permission check for other pages is handled in ClientLayout

    }, [isClient, authChecked, currentUser, pathname, router]);


  // --- Auth Functions ---
  const login = useCallback((username: string, passwordAttempt: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    // !! WARNING: Comparing plaintext passwords. HIGHLY INSECURE.
    if (user && user.passwordHash === passwordAttempt) {
        // Ensure permissions are loaded into currentUser state
        const userWithPermissions = {
            ...user,
            permissions: user.permissions || (user.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS),
        };
        setCurrentUser(userWithPermissions);
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

    // Add User (Admin Only)
    const addUser = useCallback((data: Omit<User, 'id' | 'passwordHash' | 'permissions'> & {password: string}): boolean => {
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
            // Assign default permissions based on role
            permissions: data.role === 'superadmin'
                            ? MANAGEABLE_PATHS.map(p => p.path) // Superadmin gets all
                            : DEFAULT_ALLOWED_PATHS, // Regular user gets defaults
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
        toast({ title: "User Added", description: `User ${data.username} created successfully.` });
        return true;
    }, [currentUser, users, setUsers, generateUuid]);

    // Update User (Admin Only)
    const updateUser = useCallback((id: string, data: UserUpdateData): boolean => {
        if (currentUser?.role !== 'superadmin') {
            toast({ title: "Permission Denied", description: "Only admins can update users.", variant: "destructive"});
            return false;
        }

        let userToUpdate: User | undefined;
        let updatedUsersList: User[] = [];

        setUsers(prevUsers => {
            const userIndex = prevUsers.findIndex(u => u.id === id);
            if (userIndex === -1) {
                toast({ title: "Error", description: "User not found.", variant: "destructive"});
                return prevUsers; // Return previous state if user not found
            }

            userToUpdate = prevUsers[userIndex];

            // Check for username conflict if username is being changed
            if (data.username && data.username !== userToUpdate.username && prevUsers.some(u => u.username.toLowerCase() === data.username?.toLowerCase() && u.id !== id)) {
                toast({ title: "Error", description: "Username already exists.", variant: "destructive"});
                return prevUsers; // Return previous state if username conflict
            }


            // Determine new permissions if role changes
            let newPermissions = userToUpdate.permissions;
            if (data.role && data.role !== userToUpdate.role) {
                newPermissions = data.role === 'superadmin'
                                    ? MANAGEABLE_PATHS.map(p => p.path)
                                    : DEFAULT_ALLOWED_PATHS; // Reset permissions on role change
            }

            updatedUsersList = [...prevUsers];
            updatedUsersList[userIndex] = {
                ...userToUpdate,
                username: data.username ?? userToUpdate.username,
                role: data.role ?? userToUpdate.role,
                // Update passwordHash only if a new password is provided
                passwordHash: data.password ? data.password : userToUpdate.passwordHash, // !! INSECURE !!
                permissions: newPermissions, // Update permissions if role changed
            };

             return updatedUsersList;
        });

        // Update currentUser state outside of setUsers if the current user was the one updated
        if (userToUpdate && currentUser?.id === id) {
            const updatedCurrentUser = updatedUsersList.find(u => u.id === id);
            if(updatedCurrentUser) {
                setCurrentUser(updatedCurrentUser);
            }
        }


        toast({ title: "User Updated", description: `User ${data.username ?? userToUpdate?.username} updated successfully.` });
        return true;
    }, [currentUser, setUsers]); // Removed 'users' dependency here as we use the prevUsers in setUsers

     // Delete User (Admin Only)
     const deleteUser = useCallback((id: string): boolean => {
         if (currentUser?.role !== 'superadmin') {
             toast({ title: "Permission Denied", description: "Only admins can delete users.", variant: "destructive" });
             return false;
         }

         const userToDelete = users.find(u => u.id === id);

         if (!userToDelete) {
              toast({ title: "Error", description: "User not found.", variant: "destructive"});
              return false;
         }

         // Prevent deleting self (redundant with UI check, but good safeguard)
         if (userToDelete.id === currentUser.id) {
              toast({ title: "Error", description: "Cannot delete your own account.", variant: "destructive"});
              return false;
         }

         // Prevent deleting the last superadmin
          if (userToDelete.role === 'superadmin') {
              const superadminCount = users.filter(u => u.role === 'superadmin').length;
              if (superadminCount <= 1) {
                  toast({ title: "Action Prohibited", description: "Cannot delete the last superadmin.", variant: "destructive"});
                  return false;
              }
          }


         setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
         toast({ title: "User Deleted", description: `User ${userToDelete.username} has been deleted.`, variant: "destructive" });
         return true;
     }, [currentUser, users, setUsers]);

     // Update User Permissions (Admin Only)
     const updateUserPermissions = useCallback((userId: string, permissions: string[]): boolean => {
         if (currentUser?.role !== 'superadmin') {
             toast({ title: "Permission Denied", description: "Only admins can change permissions.", variant: "destructive" });
             return false;
         }

          let updatedUser: User | undefined;
          let finalUsersList: User[] = [];


         setUsers(prevUsers => {
            const userIndex = prevUsers.findIndex(u => u.id === userId);
            if (userIndex === -1) {
                toast({ title: "Error", description: "User not found.", variant: "destructive" });
                return prevUsers;
            }

             const userToUpdate = prevUsers[userIndex];

             // Ensure dashboard is always included for non-admins
             let finalPermissions = [...permissions];
             if (userToUpdate.role !== 'superadmin' && !finalPermissions.includes('/')) {
                 finalPermissions.push('/');
             }
             // Superadmins always have all permissions, don't allow modification via this function directly
             if (userToUpdate.role === 'superadmin') {
                 finalPermissions = MANAGEABLE_PATHS.map(p => p.path);
             }

             finalUsersList = [...prevUsers];
              updatedUser = {
                 ...userToUpdate,
                 permissions: finalPermissions,
             };
             finalUsersList[userIndex] = updatedUser;


             return finalUsersList;
         });

          // If the updated user is the current user, update currentUser state
          if (updatedUser && currentUser?.id === userId) {
             setCurrentUser(updatedUser);
          }


         toast({ title: "Permissions Updated", description: `Permissions for ${updatedUser?.username} updated successfully.` });
         return true;
     }, [currentUser, setUsers]); // Removed 'users' dependency


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


     setBudgets(prevBudgets => {
        const existingBudgetIndex = prevBudgets.findIndex(b =>
            b.category.toLowerCase() === dataCategoryLower && b.period === data.period
          );

        if (existingBudgetIndex !== -1) {
            const updatedBudgets = [...prevBudgets];
            updatedBudgets[existingBudgetIndex] = {
                 ...prevBudgets[existingBudgetIndex],
                 amount: data.amount,
                 category: data.category // Update category casing too
            };
            toast({
                title: "Budget Updated",
                description: `Budget for ${data.category} (${data.period}) updated to ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}.`,
              });
            return updatedBudgets.sort((a, b) => a.category.localeCompare(b.category));
        } else {
            const newBudget: Budget = {
              ...data,
              id: generateUuid!(),
            };
             toast({
                 title: "Budget Added",
                 description: `Budget for ${data.category} (${data.period}) set to ${data.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}.`,
               });
            return [...prevBudgets, newBudget].sort((a, b) => a.category.localeCompare(b.category));
        }
     });
   }, [setBudgets, generateUuid]); // Removed budgets dependency


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
    updateUser, // Expose updateUser
    deleteUser, // Expose deleteUser
    updateUserPermissions, // Expose permission update function
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
      {/* Render based on client readiness AND auth check */}
       {isClient && showContent ? children : null /* Optionally show a loading spinner here */}
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


    