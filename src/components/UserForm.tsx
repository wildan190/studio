
"use client";

import * as React from "react";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Role, User } from "@/types";
import { useAppContext } from "@/context/AppContext"; // Import context

// Schema for adding a user (password required)
const addUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["superadmin", "user"], { required_error: "Role is required" }),
});

// Schema for editing a user (password optional)
const editUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')), // Allow empty string or min 6 chars
    role: z.enum(["superadmin", "user"], { required_error: "Role is required" }),
});

type AddUserFormValues = z.infer<typeof addUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

interface UserFormProps {
  // onSubmit expects raw form data. Page component handles calling the action.
  onSubmit: (data: AddUserFormValues | EditUserFormValues) => Promise<void> | void;
  initialData?: User | null;
  onCancel?: () => void;
}

export function UserForm({ onSubmit, initialData = null, onCancel }: UserFormProps) {
  const { isMutating } = useAppContext(); // Get mutation state
  const isEditing = !!initialData;
  const formSchema = isEditing ? editUserSchema : addUserSchema;
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing
      ? { username: initialData.username, password: "", role: initialData.role }
      : { username: "", password: "", role: "user" },
  });

   useEffect(() => {
     if (initialData) {
       form.reset({
         username: initialData.username,
         password: "",
         role: initialData.role,
       });
     } else {
       form.reset({ username: "", password: "", role: "user" });
     }
   }, [initialData, form]); // Added form to dependency array


  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
    // Reset is handled by the useEffect or page logic now
    // if (!isEditing) {
    //     form.reset();
    // }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} disabled={isMutating}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditing ? 'New Password (optional)' : 'Password'}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={isEditing ? "Leave blank to keep current" : "Enter password"} {...field} disabled={isMutating}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isMutating}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isMutating}>
                {isMutating ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update User' : 'Add User')}
            </Button>
             {isEditing && onCancel && (
                 <Button type="button" variant="outline" onClick={onCancel} className="w-full" disabled={isMutating}>
                 Cancel Edit
                 </Button>
             )}
        </div>
      </form>
    </Form>
  );
}
