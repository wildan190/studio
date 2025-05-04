"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { User } from "@/types";
import { MANAGEABLE_PATHS } from "@/lib/constants"; // Import manageable paths

interface UserPermissionsDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: string[]) => void;
}

export function UserPermissionsDialog({ user, isOpen, onClose, onSave }: UserPermissionsDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    // Initialize selected permissions when the dialog opens or user changes
    if (user) {
      setSelectedPermissions(user.permissions || []);
    } else {
        setSelectedPermissions([]); // Reset if no user
    }
  }, [user, isOpen]);

  const handleCheckboxChange = (path: string, checked: boolean | "indeterminate") => {
    setSelectedPermissions(prev =>
      checked ? [...prev, path] : prev.filter(p => p !== path)
    );
  };

  const handleSaveChanges = () => {
    if (user) {
      onSave(user.id, selectedPermissions);
    }
  };

  if (!user) return null; // Don't render if no user is selected

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {user.username}</DialogTitle>
          <DialogDescription>
            Select the pages this user can access. Superadmins always have access to all pages.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {MANAGEABLE_PATHS.map(({ path, label }) => (
            <div key={path} className="flex items-center space-x-2">
              <Checkbox
                id={`permission-${path.replace('/', '')}`} // Create unique ID
                checked={selectedPermissions.includes(path)}
                onCheckedChange={(checked) => handleCheckboxChange(path, checked)}
                disabled={user.role === 'superadmin'} // Disable for superadmin
              />
              <Label htmlFor={`permission-${path.replace('/', '')}`} className="cursor-pointer">
                {label} ({path})
              </Label>
            </div>
          ))}
           {user.role === 'superadmin' && (
                <p className="text-sm text-muted-foreground italic">Superadmins automatically have access to all pages.</p>
           )}
           {user.role !== 'superadmin' && !selectedPermissions.includes('/') && (
                 <p className="text-sm text-destructive">Note: Dashboard access ('/') is required and cannot be removed.</p>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSaveChanges}
            disabled={user.role === 'superadmin'} // Disable save for superadmin
          >
                Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
