
"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Import user form and list components
import { UserForm } from "@/components/UserForm";
import { UserList } from "@/components/UserList";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function UsersPage() {
  const { currentUser, users, isClient, authChecked, addUser, deleteUser } = useAppContext();

  if (!isClient || !authChecked) {
    return (
       <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <div className="h-10 w-48 bg-muted rounded-lg animate-pulse mb-4"></div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="h-72 bg-muted rounded-lg animate-pulse"></div>
                    <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
                </div>
                <div className="h-[400px] bg-muted rounded-lg animate-pulse"></div>
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

    const handleAddUser = (data: any) => {
        console.log("Add user:", data);
        const success = addUser({ username: data.username, password: data.password, role: data.role });
        if (success) { /* Handle success */ }
    };
    const handleDeleteUser = (id: string) => {
        console.log("Delete user:", id);
        deleteUser(id);
    };
    const handleEditUser = (user: any) => { console.log("Edit user:", user); /* TODO: Implement edit logic */ };

    // Main content render
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            {/* Button is commented out, keeping it for potential future use
             <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add User
            </Button> */}
          </div>
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             {/* Column 1: Add User Form & Security Warning */}
             <div className="md:col-span-1 space-y-6">
                 <Card className="shadow-md rounded-lg">
                    <CardHeader>
                    <CardTitle>Add New User</CardTitle>
                    <CardDescription>Create a new user account and assign a role.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <UserForm onSubmit={handleAddUser} />
                    </CardContent>
                 </Card>
                <Card className="shadow-md rounded-lg border-destructive bg-destructive/5">
                    <CardHeader>
                    <CardTitle className="text-destructive">Security Warning</CardTitle>
                    <CardDescription className="text-destructive/90">
                        <strong>Important:</strong> This user management system uses local storage and handles passwords insecurely for demonstration purposes only. <strong>Do not use this in a production environment.</strong> Implement proper server-side authentication and password hashing.
                    </CardDescription>
                    </CardHeader>
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
                        {/* UserList component now sits inside CardContent */}
                        <UserList users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} />
                    </CardContent>
                 </Card>
             </div>
          </div>
        </div>
    );
}
