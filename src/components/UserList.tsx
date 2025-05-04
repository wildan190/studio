"use client";

import * as React from "react";
import { Trash2, Edit, ShieldCheck } from "lucide-react";
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
import { UserPermissionsDialog } from "./UserPermissionsDialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAppContext } from "@/context/AppContext"; // Import context


interface UserListProps {
  users: User[];
  currentUser: User | null;
  onDelete: (id: string) => Promise<void> | void; // Update signatures
  onEdit: (user: User) => void; // No change needed here, it's synchronous
  onUpdatePermissions: (userId: string, permissions: string[]) => Promise<void> | void; // Update signature
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function UserList({
    users,
    currentUser,
    onDelete,
    onEdit,
    onUpdatePermissions,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems
}: UserListProps) {
  const { isMutating } = useAppContext(); // Get mutation state
  const [selectedUserForPermissions, setSelectedUserForPermissions] = React.useState<User | null>(null);

  // Client-side check to disable delete button for self
  const canDeleteUser = (userToDelete: User): boolean => {
     if (!currentUser) return false;
     return userToDelete.id !== currentUser.id; // Cannot delete self
     // Server action handles the "last superadmin" check
  };

  const handleOpenPermissionsDialog = (user: User) => {
    setSelectedUserForPermissions(user);
  };

  const handleClosePermissionsDialog = () => {
    setSelectedUserForPermissions(null);
  };

  const handleSavePermissions = async (userId: string, permissions: string[]) => {
      // Toast is handled by the page/action now
      await onUpdatePermissions(userId, permissions);
      handleClosePermissionsDialog();
  };

   const handleDeleteClick = async (id: string, username: string) => {
     // Toast is handled by the page/action now
     await onDelete(id);
   }


  if (!users.length && totalItems === 0) {
     return <p className="text-muted-foreground text-center p-4">No users found.</p>;
   }


  return (
    <>
       <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow rounded-md border">
            <Table>
                <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                 {users.length > 0 ? (
                    users.map((user) => {
                        const isCurrentUser = currentUser?.id === user.id;
                        const disableDelete = !canDeleteUser(user) || isMutating; // Also disable during mutation
                        const isSuperAdmin = user.role === 'superadmin';

                        return (
                            <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username} {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}</TableCell>
                            <TableCell>
                                <Badge variant={isSuperAdmin ? "default" : "secondary"} className={isSuperAdmin ? 'bg-accent text-accent-foreground' : ''}>
                                    {user.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(user)}
                                    aria-label="Edit user"
                                    title="Edit User Details"
                                    disabled={isMutating} // Disable during mutation
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenPermissionsDialog(user)}
                                    aria-label="Manage permissions"
                                    title="Manage Permissions"
                                    disabled={isSuperAdmin || isMutating} // Disable for superadmins or during mutation
                                    className="text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Delete user"
                                            title="Delete User"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={disableDelete}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the user <span className="font-semibold">{user.username}</span>. Associated budgets and transactions will also be deleted (if cascade is set up in DB).
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleDeleteClick(user.id, user.username)}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                             disabled={isMutating} // Disable during mutation
                                            >
                                            {isMutating ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                            </TableCell>
                            </TableRow>
                        );
                    })
                 ) : (
                    <TableRow>
                         <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            No users on this page.
                         </TableCell>
                     </TableRow>
                 )}
                </TableBody>
            </Table>
            </ScrollArea>
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                itemName="users"
            />
       </div>

        {/* Permissions Dialog */}
        {selectedUserForPermissions && (
            <UserPermissionsDialog
                user={selectedUserForPermissions}
                isOpen={!!selectedUserForPermissions}
                onClose={handleClosePermissionsDialog}
                onSave={handleSavePermissions} // Pass the async handler
            />
        )}
    </>
  );
}
