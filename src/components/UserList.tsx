
"use client";

import * as React from "react";
import { Trash2, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { User } from "@/types";

interface UserListProps {
  users: User[];
  currentUser: User | null; // Pass current user for comparison
  onDelete: (id: string) => void;
  onEdit?: (user: User) => void;
}

export function UserList({ users, currentUser, onDelete, onEdit }: UserListProps) {

  const canDeleteUser = (userToDelete: User): boolean => {
     if (!currentUser) return false; // Should not happen if viewing the page, but safety check
     if (userToDelete.id === currentUser.id) return false; // Cannot delete self

     // Prevent deleting the last superadmin
     if (userToDelete.role === 'superadmin') {
         const superadminCount = users.filter(u => u.role === 'superadmin').length;
         if (superadminCount <= 1) {
             return false;
         }
     }
     return true; // Otherwise, can delete
  };


  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-secondary">
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
             const isCurrentUser = currentUser?.id === user.id;
             const disableDelete = !canDeleteUser(user);

             return (
                <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username} {isCurrentUser && '(You)'}</TableCell>
                <TableCell>
                    <Badge variant={user.role === 'superadmin' ? "default" : "secondary"} className={user.role === 'superadmin' ? 'bg-accent text-accent-foreground' : ''}>
                        {user.role}
                    </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                    <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(user)} // Call edit handler if provided
                    aria-label="Edit user"
                    >
                    <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete user"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={disableDelete} // Disable button based on logic
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user <span className="font-semibold">{user.username}</span>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => onDelete(user.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </TableCell>
                </TableRow>
            );
           })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
