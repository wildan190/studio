
"use client";

import * as React from "react";
import { useState } from "react"; // Import useState
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Import user form and list components
import { UserForm } from "@/components/UserForm";
import { UserList } from "@/components/UserList";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User } from "@/types"; // Import User type

export default function UsersPage() {
  const { currentUser, users, isClient, authChecked, addUser, deleteUser, updateUser } = useAppContext(); // Add updateUser
  const [editingUser, setEditingUser] = useState<User | null>(null); // State for user being edited

  if (!isClient || !authChecked) {
    return (
       <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <div className="h-10 w-48 bg-muted rounded-lg animate-pulse mb-4"></div>
            <Separator />
            {/* Moved Security Warning Skeleton Here */}
            <div className="h-32 bg-muted rounded-lg animate-pulse mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-72 bg-muted rounded-lg animate-pulse"></div> {/* Form Skeleton */}
                <div className="h-[400px] bg-muted rounded-lg animate-pulse"></div> {/* List Skeleton */}
            </div>
       </div>
    );
  }

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

    // Handlers
    const handleAddUser = (data: any) => {
        const success = addUser({ username: data.username, password: data.password, role: data.role });
        if (success) {
            setEditingUser(null); // Clear editing state after adding
        }
    };

    const handleUpdateUser = (data: any) => {
        if (!editingUser) return;
        const success = updateUser(editingUser.id, {
             username: data.username,
             role: data.role,
             ...(data.password && { password: data.password }) // Only include password if provided
         });
        if (success) {
            setEditingUser(null); // Clear editing state on success
        }
    };

    const handleDeleteUser = (id: string) => {
        // Prevent deleting self if last superadmin
        const userToDelete = users.find(u => u.id === id);
         if (userToDelete && userToDelete.id === currentUser.id && userToDelete.role === 'superadmin') {
             const superadminCount = users.filter(u => u.role === 'superadmin').length;
             if (superadminCount <= 1) {
                  // Show alert dialog instead of toast for critical action
                  // This requires adding state for an alert dialog, or handling it within the AlertDialogTrigger in UserList
                  alert("Cannot delete the last superadmin."); // Simple alert for now
                  return;
             }
         }
        deleteUser(id);
         if (editingUser?.id === id) {
             setEditingUser(null); // Clear edit form if the edited user is deleted
         }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
         window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see the form
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
    };


    // Main content render
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          </div>
          <Separator />

            {/* Security Warning Moved to Top */}
            <Card className="shadow-md rounded-lg border-destructive bg-destructive/5 mb-6">
                <CardHeader>
                <CardTitle className="text-destructive">Security Warning</CardTitle>
                <CardDescription className="text-destructive/90">
                    <strong>Important:</strong> This user management system uses local storage and handles passwords insecurely for demonstration purposes only. <strong>Do not use this in a production environment.</strong> Implement proper server-side authentication and password hashing.
                </CardDescription>
                </CardHeader>
             </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             {/* Column 1: Add/Edit User Form */}
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

             {/* Column 2: User List */}
             <div className="md:col-span-1">
                <Card className="shadow-md rounded-lg">
                    <CardHeader>
                    <CardTitle>Current Users</CardTitle>
                    <CardDescription>List of all registered users and their roles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <UserList users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} currentUser={currentUser}/>
                    </CardContent>
                 </Card>
             </div>
          </div>
        </div>
    );
}
