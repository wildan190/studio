"use client";

import * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAppContext } from "@/context/AppContext";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react"; // Optional: for logo
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
   // Use isLoading for initial page load check, isMutating for form submission
  const { login, isClient, authChecked, isMutating } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false); // Local state for form submission


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
     setIsSubmitting(true); // Indicate submission start
     try {
        await login(values.username, values.password);
        // Redirect is handled within the AppContext's useEffect now
     } catch (error) {
        // Error toast is likely handled within the login function itself
        console.error("Login submission error:", error)
     } finally {
        setIsSubmitting(false); // Indicate submission end regardless of outcome
     }
  };

   // Show skeleton while waiting for client and auth check
   if (!isClient || !authChecked) {
        return (
         <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30">
             <Card className="w-full max-w-sm shadow-xl p-6">
                 <div className="flex justify-center mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                 </div>
                 <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                 <Skeleton className="h-4 w-full mx-auto mb-6" />
                 <Skeleton className="h-10 w-full mb-4" />
                 <Skeleton className="h-10 w-full mb-4" />
                 <Skeleton className="h-10 w-full" />
             </Card>
         </div>
         );
   }

   // isMutating reflects ongoing background operations from context (like data fetching after login)
   // isSubmitting reflects the local form submission process
   const disableForm = isSubmitting || isMutating;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
             <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">BizFlow Login</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} disabled={disableForm} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} disabled={disableForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={disableForm}>
                 {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
