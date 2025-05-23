
'use client';

import * as React from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns'; // Import isValid
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
            .filter((budget) => budget.dueDate && isValid(new Date(budget.dueDate))) // Ensure dueDate is valid
            .map((budget) => ({
                id: budget.id,
                date: new Date(budget.dueDate!), // Assert non-null and ensure it's a Date object
                title: `Budget: ${budget.category}`,
                amount: budget.amount,
            }));
    }, [budgets]);

    // Filter events for the selected date
    const eventsForSelectedDate = React.useMemo(() => {
        if (!selectedDate || !isValid(selectedDate)) return []; // Check selectedDate validity
        const selectedDateString = format(selectedDate, 'yyyy-MM-dd');
        return budgetEvents.filter(event => isValid(event.date) && format(event.date, 'yyyy-MM-dd') === selectedDateString);
    }, [selectedDate, budgetEvents]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
    }

    // Custom day cell renderer to show budget markers
    const renderDay = ({ date }: { date: Date }) => {
        // Validate the date before formatting. react-day-picker might pass invalid dates/objects for layout.
        if (!date || !isValid(date)) {
             // Do not log an error here, as it might be expected behavior from the library for non-date cells.
             // console.error("Invalid date passed to renderDay:", day);
             // Return an empty div for invalid/placeholder cells to avoid showing "?"
             return <div className="relative flex flex-col items-center justify-center h-full text-muted-foreground text-xs"></div>;
         }

        const dateString = format(date, 'yyyy-MM-dd');
        // Ensure budgetEvents dates are also valid before comparison
        const budgetsDueOnDay = budgetEvents.filter(event => isValid(event.date) && format(event.date, 'yyyy-MM-dd') === dateString);

        return (
            <div className="relative flex flex-col items-center justify-center h-full group"> {/* Added group for potential hover effects */}
                 {/* Default day number rendering */}
                 <span className={cn(
                     "group-hover:font-semibold", // Example hover effect
                 )}>{format(date, 'd')}</span>

                {/* Budget markers */}
                {budgetsDueOnDay.length > 0 && (
                    <div className="absolute bottom-1 flex space-x-1">
                        {budgetsDueOnDay.slice(0, 3).map((_, index) => ( // Show max 3 dots
                            <span key={index} className="block h-1.5 w-1.5 rounded-full bg-primary transition-transform duration-200 group-hover:scale-125"></span> // Added hover effect
                        ))}
                         {budgetsDueOnDay.length > 3 && (
                            <span className="block h-1.5 w-1.5 rounded-full bg-muted-foreground transition-transform duration-200 group-hover:scale-125"></span> // Indicate more items + hover effect
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

    // Ensure budgetEvents dates are valid Date objects before passing to Calendar modifiers
    const validBudgetEventDates = budgetEvents.map(event => event.date).filter(date => isValid(date));

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
                                components={{ DayContent: renderDay as (props: any) => React.JSX.Element }} // Use custom renderer
                                classNames={{
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
                                    day_today: "bg-accent text-accent-foreground rounded-full",
                                    // Add custom class for days with events? Or handle via renderDay styles
                                }}
                                modifiers={{
                                    // Highlight days with budget events
                                    hasEvents: validBudgetEventDates, // Use validated dates
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
                                 Events for {selectedDate && isValid(selectedDate) ? format(selectedDate, 'PPP') : 'Selected Date'}
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
                                    {selectedDate && isValid(selectedDate) ? "No budget items due on this date." : "Select a date to view events."}
                                 </p>
                             )}
                         </CardContent>
                     </Card>
                 </div>
            </div>
        </main>
    );
}
