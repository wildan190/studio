"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { UserForm } from "@/components/UserForm"; // Ensure path is correct
import { UserList } from "@/components/UserList"; // Ensure path is correct
import type { User } from "@/types";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export default function UsersPage() {
  const {
      currentUser,
      users,
      addUser,
      deleteUser,
      updateUser,
      updateUserPermissions,
      isLoading, // Use loading state from context
      isMutating, // Use mutating state from context
      isClient,
      authChecked,
      fetchData, // Get fetchData to refresh user list if needed
    } = useAppContext();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

   // Recalculate pagination based on users from context
   const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
   const paginatedUsers = users.slice(
     (currentPage - 1) * ITEMS_PER_PAGE,
     currentPage * ITEMS_PER_PAGE
   );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

   // --- Permissions Check & Loading State ---
    // Combine loading state and auth check
    if (isLoading || !isClient || !authChecked) {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Separator />
          <Skeleton className="h-32 w-full rounded-lg mb-6" /> {/* Security Warning Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Skeleton className="h-[300px] w-full rounded-lg" /> {/* Form Skeleton */}
             <Skeleton className="h-[400px] w-full rounded-lg" /> {/* List Skeleton */}
          </div>
            <div className="text-center text-muted-foreground text-sm mt-4">Loading User Management...</div>
        </div>
      );
    }

    // Check role after loading and auth check are complete
    if (currentUser?.role !== 'superadmin') {
    return (
       <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <Card className="shadow-md rounded-lg border-destructive">
                <CardHeader>
                <CardTitle className="text-destructive">Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                <p>You do not have permission to view this page. Only Superadmins can manage users.</p>
                </CardContent>
            </Card>
       </div>
    );
    }


    // --- Handlers ---
    const handleAddUser = async (data: any) => {
       // Ensure role is passed correctly, potentially mapping from string if form returns string
       const success = await addUser({ username: data.username, password: data.password, role: data.role });
        if (success) {
            setEditingUser(null); // Clear editing state after successful add
            // Optionally refetch users if the list isn't automatically updated by the context state change
            // await fetchData(); // Or rely on context state update
        }
    };

    const handleUpdateUser = async (data: any) => {
        if (!editingUser) return;
        const success = await updateUser(editingUser.id, {
             username: data.username,
             role: data.role, // Ensure role is passed correctly
             ...(data.password && { password: data.password })
         });
        if (success) {
            setEditingUser(null); // Clear editing state on success
             // Optionally refetch users if the list isn't automatically updated by the context state change
            // await fetchData(); // Or rely on context state update
        }
    };

    const handleDeleteUser = async (id: string) => {
         // The core logic (preventing last admin delete) is now in the server action
        const success = await deleteUser(id);
         if (success && editingUser?.id === id) {
             setEditingUser(null); // Clear edit form if the edited user is deleted
         }
          // Optionally refetch users if the list isn't automatically updated by the context state change
         // if (success) await fetchData(); // Or rely on context state update
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
         window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
    };

    const handleUpdatePermissions = async (userId: string, permissions: string[]) => {
        await updateUserPermissions(userId, permissions);
         // Optionally refetch users if the list isn't automatically updated by the context state change
        // await fetchData(); // Or rely on context state update
    };


    // Main content render
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
             {isMutating && ( // Optional: Show a subtle indicator during mutations
                 <div className="text-sm text-muted-foreground italic">Processing...</div>
             )}
          </div>
          <Separator />

            <Card className="shadow-md rounded-lg border-destructive bg-destructive/5 mb-6">
                <CardHeader>
                <CardTitle className="text-destructive">Security Warning</CardTitle>
                <CardDescription className="text-destructive/90">
                    <strong>Important:</strong> Password handling uses secure hashing (bcrypt). Permissions are enforced server-side. Ensure database connection and environment variables are properly secured.
                </CardDescription>
                </CardHeader>
             </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             <div className="md:col-span-1 space-y-6">
                 <Card className="shadow-md rounded-lg">
                    <CardHeader>
                     <CardTitle>{editingUser ? 'Edit User' : 'Add New User'}</CardTitle>
                     <CardDescription>{editingUser ? `Update details for ${editingUser.username}` : 'Create a new user account and assign a role.'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                     <UserForm
                         onSubmit={editingUser ? handleUpdateUser : handleAddUser}
                         initialData={editingUser}
                         onCancel={handleCancelEdit}
                     />
                    </CardContent>
                 </Card>
             </div>

             <div className="md:col-span-1">
                <Card className="shadow-md rounded-lg flex flex-col">
                    <CardHeader>
                    <CardTitle>Current Users</CardTitle>
                    <CardDescription>List of all registered users and their roles. Edit, delete, or manage permissions.</CardDescription>
                    </CardHeader>
                    {/* UserList expects users of type User[] which should be correct */}
                        <UserList
                            users={paginatedUsers}
                            onDelete={handleDeleteUser}
                            onEdit={handleEditUser}
                            currentUser={currentUser}
                            onUpdatePermissions={handleUpdatePermissions}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            itemsPerPage={ITEMS_PER_PAGE}
                            totalItems={users.length}
                         />
                 </Card>
             </div>
          </div>
        </div>
    );
}
