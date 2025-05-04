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
import { MANAGEABLE_PATHS } from "@/lib/constants";
import { useAppContext } from "@/context/AppContext"; // Import context


interface UserPermissionsDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: string[]) => Promise<void> | void; // Update signature
}

export function UserPermissionsDialog({ user, isOpen, onClose, onSave }: UserPermissionsDialogProps) {
  const { isMutating } = useAppContext(); // Get mutation state
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
       // Ensure we use the permissions from the user object, default if undefined
       setSelectedPermissions(user.permissions || (user.role === 'superadmin' ? MANAGEABLE_PATHS.map(p => p.path) : DEFAULT_ALLOWED_PATHS));
    } else {
        setSelectedPermissions([]);
    }
  }, [user, isOpen]);

  const handleCheckboxChange = (path: string, checked: boolean | "indeterminate") => {
    setSelectedPermissions(prev => {
        const newPermissions = checked ? [...prev, path] : prev.filter(p => p !== path);
        // Ensure dashboard ('/') is always included for non-superadmins
        if (user?.role !== 'superadmin' && !newPermissions.includes('/')) {
            newPermissions.push('/');
        }
        return newPermissions;
    });
  };

  const handleSaveChanges = async () => {
    if (user) {
        // Ensure dashboard is included one last time before saving
        let finalPermissions = [...selectedPermissions];
        if (user.role !== 'superadmin' && !finalPermissions.includes('/')) {
            finalPermissions.push('/');
        }
        await onSave(user.id, finalPermissions);
    }
  };

  if (!user) return null;

    const isSuperAdmin = user.role === 'superadmin';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {user.username}</DialogTitle>
          <DialogDescription>
             Select the pages this user can access. Superadmins always have access to all pages. Dashboard access is always granted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {MANAGEABLE_PATHS.map(({ path, label }) => {
              // Disable checkbox for '/' if user is not superadmin, as it's always required
              const isDisabled = isSuperAdmin || (path === '/' && !isSuperAdmin) || isMutating;
              return (
                  <div key={path} className="flex items-center space-x-2">
                      <Checkbox
                          id={`permission-${path.replace('/', '')}`}
                          checked={selectedPermissions.includes(path)}
                          onCheckedChange={(checked) => handleCheckboxChange(path, checked)}
                          disabled={isDisabled}
                      />
                      <Label
                          htmlFor={`permission-${path.replace('/', '')}`}
                          className={isDisabled ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}
                      >
                          {label} ({path}) {path === '/' && !isSuperAdmin ? '(Required)' : ''}
                      </Label>
                  </div>
              );
           })}
           {isSuperAdmin && (
                <p className="text-sm text-muted-foreground italic">Superadmins automatically have access to all pages.</p>
           )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMutating}>Cancel</Button>
          <Button
            onClick={handleSaveChanges}
            disabled={isSuperAdmin || isMutating} // Disable save for superadmin or during mutation
          >
                {isMutating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
