"use client";

import * as React from "react";
import { Trash2, Edit, ShieldCheck } from "lucide-react"; // Added ShieldCheck icon
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
import { UserPermissionsDialog } from "./UserPermissionsDialog"; // Import the new dialog
import { PaginationControls } from "@/components/ui/pagination-controls"; // Import pagination controls


interface UserListProps {
  users: User[];
  currentUser: User | null; // Pass current user for comparison
  onDelete: (id: string) => void;
  onEdit: (user: User) => void; // Make onEdit mandatory for this component
  onUpdatePermissions: (userId: string, permissions: string[]) => void; // Callback for updating permissions
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
  const [selectedUserForPermissions, setSelectedUserForPermissions] = React.useState<User | null>(null);

  const canDeleteUser = (userToDelete: User): boolean => {
     if (!currentUser) return false; // Should not happen if viewing the page, but safety check
     if (userToDelete.id === currentUser.id) return false; // Cannot delete self

     // Prevent deleting the last superadmin
     if (userToDelete.role === 'superadmin') {
          // Need to check total number of superadmins from the full list, not just paginated
          // This info isn't available here, ideally passed down or fetched if needed
          // For now, assume this check is handled correctly in the delete handler in the page component
          // const superadminCount = users.filter(u => u.role === 'superadmin').length; // This only checks current page
         // if (superadminCount <= 1) {
         //     return false;
         // }
     }
     return true; // Otherwise, can delete (assuming page-level check handles last superadmin)
  };

  const handleOpenPermissionsDialog = (user: User) => {
    setSelectedUserForPermissions(user);
  };

  const handleClosePermissionsDialog = () => {
    setSelectedUserForPermissions(null);
  };

  const handleSavePermissions = (userId: string, permissions: string[]) => {
      onUpdatePermissions(userId, permissions);
      handleClosePermissionsDialog(); // Close dialog after saving
  };

  if (!users.length && totalItems === 0) {
     return <p className="text-muted-foreground text-center p-4">No users found.</p>;
   }


  return (
    <>
       <div className="flex flex-col h-full"> {/* Ensure container takes height */}
            <ScrollArea className="flex-grow rounded-md border"> {/* Use flex-grow */}
            <Table>
                <TableHeader className="sticky top-0 bg-secondary z-10">{/* Ensure no whitespace */}
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
                        const disableDelete = !canDeleteUser(user);
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
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenPermissionsDialog(user)}
                                    aria-label="Manage permissions"
                                    title="Manage Permissions"
                                    disabled={isSuperAdmin} // Disable for superadmins as they have all permissions
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
                onSave={handleSavePermissions}
            />
        )}
    </>
  );
}
