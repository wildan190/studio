"use client";

import * as React from "react";
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Import user form and list components (to be created)
// import { UserForm } from "@/components/UserForm";
// import { UserList } from "@/components/UserList";

export default function UsersPage() {
  const { currentUser, users, isClient, authChecked } = useAppContext();

  // Loading state (consider a more robust loading indicator)
   if (!isClient || !authChecked) {
     return (
       <div className="flex flex-1 flex-col p-4 md:p-6 space-y-4">
         <div className="h-10 w-48 bg-muted rounded-lg animate-pulse"></div>
         <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
         <footer className="mt-12 text-center text-muted-foreground text-sm">
             <Separator className="my-4" />
              Loading User Management...
         </footer>
       </div>
     );
   }

   // Basic Access Control Check (although redirect should handle this)
   if (currentUser?.role !== 'superadmin') {
     // This shouldn't be reached if redirect logic works, but acts as a fallback
     return (
         <div className="p-4 md:p-6"> {/* Use a div for padding */}
             <h1 className="text-2xl font-semibold tracking-tight text-destructive">Access Denied</h1>
             <p className="text-muted-foreground">You do not have permission to view this page.</p>
         </div>
     );
   }
   // The closing brace for the function was missing before this return statement

  return (
    // Use a div instead of main, as ClientLayout provides the main structure
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            {/* <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add User
            </Button> */}
            {/* TODO: Implement Add User Modal/Form Trigger */}
        </div>

        <section id="user-management" className="space-y-6">
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg">Manage Users & Roles</CardTitle>
                    <CardDescription>Add, edit, or remove users and manage their access roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Placeholder for User Form and List */}
                    <p className="text-muted-foreground italic">User list and form components will be implemented here.</p>
                    <p className="mt-2 text-muted-foreground">Current user count: {users.length}</p>
                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                             <UserForm onSubmit={handleAddUser} /> {/* TODO: Implement UserForm */}
                        </div>
                        <div className="md:col-span-2">
                           <UserList users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} /> {/* TODO: Implement UserList and handlers */}
                        </div>
                    </div> */}
                </CardContent>
            </Card>
             <Card className="shadow-md rounded-lg border-accent">
                <CardHeader>
                    <CardTitle className="text-lg text-accent">Security Warning</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive-foreground bg-destructive/10 border border-destructive p-3 rounded-md">
                        <strong>Important:</strong> This user management system uses local storage and handles passwords in an insecure manner for demonstration purposes only. <strong>Do not use this in a production environment.</strong> Implement proper server-side authentication and password hashing.
                    </p>
                </CardContent>
            </Card>
        </section>
    </div>
  );
} // Added missing closing brace for the function scope