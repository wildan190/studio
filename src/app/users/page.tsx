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
      <Card>
        <CardHeader>
          <CardTitle>
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          Loading User Management...
        </CardContent>
      </Card>
    );
  }

  if (currentUser?.role !== 'superadmin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          You do not have permission to view this page.
        </CardContent>
      </Card>
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            {/* <Button size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add User
            </Button> */}
        </div>
        <Separator />
        <Card className="shadow-md rounded-lg">
            <CardHeader>
                <CardTitle>Add User</CardTitle>
                <CardDescription>Manage Users &amp; Roles</CardDescription>
            </CardHeader>
            <CardContent>
                <UserForm onSubmit={handleAddUser} /> {/* TODO: Implement UserForm */}
            </CardContent>
        </Card>
         <Card className="shadow-md rounded-lg">
            <CardHeader>
                <CardTitle>Security Warning</CardTitle>
                <CardDescription><strong>Important:</strong> This user management system uses local storage and handles passwords in an insecure manner for demonstration purposes only. <strong>Do not use this in a production environment.</strong> Implement proper server-side authentication and password hashing.</CardDescription>
            </CardHeader>
        </Card>
        {/* Main content / User list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                        
                  </div>
                  <div className="md:col-span-2">
                      <UserList users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} /> {/* TODO: Implement UserList and handlers */}
                  </div>
              </div>
    </div>
  );
}
