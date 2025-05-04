'use client';

import * as React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetEvent {
    id: string;
    date: Date;
    title: string; // e.g., "Budget: Rent Due"
    amount: number;
}

export default function CalendarPage() {
    const { budgets, isLoading, isClient, authChecked, currentUser } = useAppContext();
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
    const [month, setMonth] = React.useState<Date>(new Date()); // State to track the displayed month

    const budgetEvents = React.useMemo(() => {
        return budgets
            .filter((budget) => budget.dueDate) // Only include budgets with a due date
            .map((budget) => ({
                id: budget.id,
                date: budget.dueDate!, // Assert non-null as we filtered
                title: `Budget: ${budget.category}`,
                amount: budget.amount,
            }));
    }, [budgets]);

    // Filter events for the selected date
    const eventsForSelectedDate = React.useMemo(() => {
        if (!selectedDate) return [];
        const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
        return budgetEvents.filter(event => format(event.date, 'yyyy-MM-dd') === selectedDateString);
    }, [selectedDate, budgetEvents]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
    }

    // Custom day cell renderer to show budget markers
    const renderDay = (day: Date) => {
        const dateString = format(day, 'yyyy-MM-dd');
        const budgetsDueOnDay = budgetEvents.filter(event => format(event.date, 'yyyy-MM-dd') === dateString);

        return (
            <div className="relative flex flex-col items-center justify-center h-full">
                <span>{format(day, 'd')}</span>
                {budgetsDueOnDay.length > 0 && (
                    <div className="absolute bottom-1 flex space-x-1">
                        {budgetsDueOnDay.slice(0, 3).map((_, index) => ( // Show max 3 dots
                            <span key={index} className="block h-1.5 w-1.5 rounded-full bg-primary"></span>
                        ))}
                         {budgetsDueOnDay.length > 3 && (
                            <span className="block h-1.5 w-1.5 rounded-full bg-muted-foreground"></span> // Indicate more items
                        )}
                    </div>
                )}
            </div>
        );
    };


    // Check permissions - needs currentUser from context
    const canAccessPage = React.useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role === 'superadmin' || currentUser.permissions?.includes('/calendar');
    }, [currentUser]);


    // --- Loading and Auth State ---
    if (isLoading || !isClient || !authChecked) {
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                         <Skeleton className="h-[400px] w-full rounded-lg" />
                    </div>
                    <div className="md:col-span-1">
                        <Skeleton className="h-[400px] w-full rounded-lg" />
                    </div>
                </div>
                <div className="text-center text-muted-foreground text-sm mt-4">Loading Calendar...</div>
            </div>
        );
    }

    // Permission Denied Check (after loading)
    if (!canAccessPage) {
         return (
           <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
             <Card className="shadow-md rounded-lg border-destructive">
               <CardHeader>
                 <CardTitle className="text-destructive">Access Denied</CardTitle>
               </CardHeader>
               <CardContent>
                 <p>You do not have permission to view the Calendar page.</p>
               </CardContent>
             </Card>
           </div>
         );
     }

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Budget Calendar</h1>
            <p className="text-muted-foreground text-sm">View budget due dates.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                 <div className="md:col-span-2">
                    <Card className="shadow-md rounded-lg">
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                month={month}
                                onMonthChange={setMonth}
                                className="w-full"
                                components={{ DayContent: renderDay }} // Use custom renderer
                                classNames={{
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
                                    day_today: "bg-accent text-accent-foreground rounded-full",
                                    // Add custom class for days with events? Or handle via renderDay styles
                                }}
                                modifiers={{
                                    // Highlight days with budget events
                                    hasEvents: budgetEvents.map(event => event.date),
                                }}
                                modifiersClassNames={{
                                    hasEvents: 'font-bold text-primary', // Example styling
                                }}

                            />
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-1">
                     <Card className="shadow-md rounded-lg">
                         <CardHeader>
                             <CardTitle className="text-lg">
                                 Events for {selectedDate ? format(selectedDate, 'PPP') : 'Selected Date'}
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 h-[350px] overflow-y-auto">
                             {eventsForSelectedDate.length > 0 ? (
                                eventsForSelectedDate.map(event => (
                                    <div key={event.id} className="p-3 rounded-md border bg-card">
                                        <p className="font-semibold">{event.title}</p>
                                        <p className="text-sm text-muted-foreground">Amount: {formatCurrency(event.amount)}</p>
                                    </div>
                                ))
                             ) : (
                                 <p className="text-muted-foreground text-center py-4">
                                    {selectedDate ? "No budget items due on this date." : "Select a date to view events."}
                                 </p>
                             )}
                         </CardContent>
                     </Card>
                 </div>
            </div>
        </main>
    );
}
