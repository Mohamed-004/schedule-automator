"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Check, ChevronsUpDown, PlusIcon, Trash2, User, Clock, Loader2 } from "lucide-react";
import { format, differenceInMinutes, set, addDays, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createJob, getAvailableWorkersAction, createClient, getWorkerScheduleAction } from "../actions";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "react-phone-number-input/style.css";
import PhoneInput, { isPossiblePhoneNumber } from "react-phone-number-input";
import { Progress } from "@/components/ui/progress";
import {
    Briefcase,
    FileText,
    ListChecks,
    Users,
    ChevronRight,
    Building,
    Mail,
    Phone,
    AlertTriangle,
    MapPin,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addMinutes } from "date-fns";

const assignmentFormSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters."),
    description: z.string().optional(),
    clientId: z.string().uuid({ message: "Please select a client." }),
    scheduledAtDate: z.date({ required_error: "A date is required." }),
    scheduledAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
    scheduledEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
    duration: z.coerce.number().int().positive("Duration must be calculated."),
    assignedWorkerId: z.string().uuid({ message: "Please select a worker." }).or(z.literal("")),
    workItems: z.array(z.object({ value: z.string().min(1, "Item cannot be empty.") })).optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface Client {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
}

interface Worker {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
}

interface WorkerSchedule {
    weekly_hours_worked: number;
    weekly_hours_goal: number;
    daily_hours_worked: number;
    daily_hours_goal: number;
    daily_schedule: { title: string; start_time: string; end_time: string }[] | null;
    daily_exception_reason: string | null;
    exception_start_time?: string | null;
    exception_end_time?: string | null;
    daily_availability_slots: { start_time: string; end_time: string }[] | null;
}

interface AssignmentFormProps {
    clients: Client[];
}

const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const totalMinutes = i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

function timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function DailyScheduleVisualizer({
    availability,
    booked,
    potentialBooking,
    isPotentialBookingValid,
}: {
    availability: { start_time: string; end_time: string }[] | null;
    booked: { title: string; start_time: string; end_time: string }[] | null;
    potentialBooking?: { start_time: string; end_time: string };
    isPotentialBookingValid?: boolean;
}) {
    const START_HOUR = 6;
    const END_HOUR = 22;
    const totalHours = END_HOUR - START_HOUR;

    const availabilityMinutes = (availability || []).map(slot => ({
        start: timeToMinutes(slot.start_time),
        end: timeToMinutes(slot.end_time),
    }));

    const bookedMinutes = (booked || []).map(job => {
        const start = new Date(job.start_time);
        const end = new Date(job.end_time);
        return {
            start: start.getHours() * 60 + start.getMinutes(),
            end: end.getHours() * 60 + end.getMinutes(),
            title: job.title
        };
    });

    const getSlotInfo = (slotMinutes: number) => {
        const endSlotMinutes = slotMinutes + 60;
        let isBooked = false;
        let isAvailable = false;
        let bookedTitle = '';

        for (const job of bookedMinutes) {
            if (Math.max(slotMinutes, job.start) < Math.min(endSlotMinutes, job.end)) {
                isBooked = true;
                bookedTitle = job.title;
                break;
            }
        }
        
        for (const avail of availabilityMinutes) {
            if (Math.max(slotMinutes, avail.start) < Math.min(endSlotMinutes, avail.end)) {
                 isAvailable = true;
                 break;
            }
        }

        if (isBooked) return { status: 'booked', title: bookedTitle };
        if (isAvailable) return { status: 'available', title: 'Available' };
        return { status: 'unavailable', title: 'Unavailable' };
    };

    return (
         <div className="w-full">
            <div className="grid text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${totalHours}, 1fr)` }}>
                 {Array.from({ length: totalHours }, (_, i) => i + START_HOUR).map(hour => (
                    <div key={hour} className="text-center">
                       {hour % 2 === 0 ? format(set(new Date(), { hours: hour }), 'ha') : ''}
                    </div>
                ))}
            </div>
            <div className="relative w-full h-8 mt-1 bg-muted/30 rounded-md overflow-hidden border">
                 {/* Vertical grid lines */}
                 {Array.from({ length: totalHours -1 }, (_, i) => (
                    <div key={`line-${i}`} className="absolute top-0 h-full w-px bg-muted/50" style={{ left: `calc(${(i + 1) / totalHours * 100}%)` }} />
                ))}

                {/* Available slots */}
                {availabilityMinutes.map((slot, i) => (
                     <TooltipProvider key={`avail-${i}`} delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="absolute top-0 h-full bg-green-200 dark:bg-green-800/50"
                                    style={{
                                        left: `${((slot.start / 60) - START_HOUR) / totalHours * 100}%`,
                                        width: `${(slot.end - slot.start) / 60 / totalHours * 100}%`,
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>Available</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}

                {/* Booked slots */}
                {bookedMinutes.map((slot, i) => (
                    <TooltipProvider key={`booked-${i}`} delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <div
                                    className="absolute top-0 h-full bg-blue-400 dark:bg-blue-600 border-x-2 border-background"
                                    style={{
                                        left: `${((slot.start / 60) - START_HOUR) / totalHours * 100}%`,
                                        width: `${(slot.end - slot.start) / 60 / totalHours * 100}%`,
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>{slot.title}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}

                {/* Potential Booking */}
                {potentialBooking && timeToMinutes(potentialBooking.end_time) > timeToMinutes(potentialBooking.start_time) && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "absolute top-0 h-full border-2 z-10",
                                        isPotentialBookingValid 
                                            ? "bg-purple-400/50 border-purple-600 dark:bg-purple-800/50 dark:border-purple-500"
                                            : "bg-red-400/50 border-red-600 dark:bg-red-800/50 dark:border-red-500"
                                    )}
                                    style={{
                                        left: `${((timeToMinutes(potentialBooking.start_time) / 60) - START_HOUR) / totalHours * 100}%`,
                                        width: `${(timeToMinutes(potentialBooking.end_time) - timeToMinutes(potentialBooking.start_time)) / 60 / totalHours * 100}%`,
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Potential Job: {formatTime(potentialBooking.start_time)} - {formatTime(potentialBooking.end_time)}</p>
                                {!isPotentialBookingValid && <p className="font-semibold text-red-600 dark:text-red-400">Conflicts with availability.</p>}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
             <div className="flex items-center justify-end gap-4 text-xs pt-2">
                 <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-muted/60 border"></div>
                    <span>Unavailable</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-800/50 border"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-blue-400 dark:bg-blue-600 border"></div>
                    <span>Booked</span>
                </div>
                {potentialBooking && (
                    <div className="flex items-center gap-1.5">
                        <div className={cn("h-3 w-3 rounded-sm border", 
                            isPotentialBookingValid 
                                ? "bg-purple-400/50 border-purple-600" 
                                : "bg-red-400/50 border-red-600")}></div>
                        <span>Potential Job</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatDuration(minutes: number): string {
    if (minutes <= 0) return "End time must be after start time.";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hStr = h > 0 ? `${h} hour${h > 1 ? 's' : ''}` : '';
    const mStr = m > 0 ? `${m} minute${m > 1 ? 's' : ''}` : '';
    return [hStr, mStr].filter(Boolean).join(' ');
}

function getInitials(name: string) {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

function formatTime(timeStr: string) {
    // A simple way to format HH:mm:ss into a Date object for formatting
    // It assumes the date part is irrelevant
    const today = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    if(isNaN(hours) || isNaN(minutes)) return "Invalid Time";
    const date = set(today, { hours, minutes, seconds: 0, milliseconds: 0 });
    return format(date, 'p');
}

function WorkerScheduleDisplay({ worker, schedule, isLoading, isSelected, scheduledDate, potentialBooking, isSelectable }: { 
    worker: Worker, 
    schedule: WorkerSchedule | null, 
    isLoading: boolean, 
    isSelected: boolean, 
    scheduledDate: Date | undefined,
    potentialBooking?: { start_time: string; end_time: string },
    isSelectable: boolean,
}) {
    if (!scheduledDate) {
         return (
            <div className="text-sm text-center text-muted-foreground py-4">
                Select a date to see worker schedules.
            </div>
        );
    }
    
    const isUnavailableAllDay = schedule?.daily_exception_reason && !schedule.exception_start_time;

    return (
        <div className={cn("w-full space-y-4 pt-4 mt-4 border-t", isSelected ? "border-emerald-200 dark:border-emerald-800" : "border-muted")}>
            {isLoading ? (
                <div className="flex items-center justify-center text-sm text-muted-foreground py-4">
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    <span>Loading schedule...</span>
                </div>
            ) : schedule ? (
                <>
                    {!isSelectable && potentialBooking && (
                        <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Scheduling Conflict</AlertTitle>
                            <AlertDescription>
                                The selected time {formatTime(potentialBooking.start_time)} - {formatTime(potentialBooking.end_time)} is outside this worker's available hours.
                            </AlertDescription>
                        </Alert>
                    )}
                    {schedule.daily_exception_reason && (
                        <Alert variant="default" className={cn(isUnavailableAllDay ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800" : "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800")}>
                            <AlertTriangle className={cn("h-4 w-4", isUnavailableAllDay ? "text-amber-500" : "text-blue-500")} />
                            <AlertTitle className={cn(isUnavailableAllDay ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300")}>
                                {isUnavailableAllDay ? "Worker Unavailable" : "Schedule Note"}
                            </AlertTitle>
                            <AlertDescription className={cn(isUnavailableAllDay ? "text-amber-700 dark:text-amber-400" : "text-blue-700 dark:text-blue-400")}>
                                {schedule.daily_exception_reason}
                                {schedule.exception_start_time && schedule.exception_end_time && (
                                     <div className="mt-2">
                                        <p className="font-semibold flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> 
                                            Available: 
                                            <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md">
                                                {formatTime(schedule.exception_start_time)} - {formatTime(schedule.exception_end_time)}
                                            </span>
                                        </p>
                                     </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Weekly Progress */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Weekly Hours</span>
                                <span className="font-semibold text-foreground">{(schedule.weekly_hours_worked ?? 0).toFixed(1)}h / {(schedule.weekly_hours_goal ?? 0).toFixed(1)}h</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Progress value={((schedule.weekly_hours_worked ?? 0) / (schedule.weekly_hours_goal || 1)) * 100} className="h-2" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{(schedule.weekly_hours_worked ?? 0).toFixed(1)} hours logged out of {(schedule.weekly_hours_goal ?? 0).toFixed(1)} scheduled this week.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        
                        {/* Daily Progress */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Hours for {format(scheduledDate, "MMM d")}</span>
                                <span className="font-semibold text-foreground">{(schedule.daily_hours_worked ?? 0).toFixed(1)}h / {(schedule.daily_hours_goal ?? 0).toFixed(1)}h</span>
                            </div>
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Progress value={((schedule.daily_hours_worked ?? 0) / (schedule.daily_hours_goal || 1)) * 100} className="h-2" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{(schedule.daily_hours_worked ?? 0).toFixed(1)} hours logged out of {(schedule.daily_hours_goal ?? 0).toFixed(1)} scheduled for this day.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="font-semibold text-sm">Daily Schedule</p>
                         {isUnavailableAllDay ? (
                            <div className="text-center text-muted-foreground italic py-8 border rounded-lg border-dashed bg-background">
                                <p>This worker is unavailable for the entire day.</p>
                            </div>
                         ) : (
                            <DailyScheduleVisualizer 
                                availability={schedule.daily_availability_slots}
                                booked={schedule.daily_schedule}
                                potentialBooking={potentialBooking}
                                isPotentialBookingValid={isSelectable}
                            />
                         )}
                    </div>
                </>
            ) : (
                <p className="text-sm text-center text-destructive py-4">Could not load schedule. Please try again.</p>
            )}
        </div>
    );
}

function isTimeWithinAvailability(startTimeStr: string, endTimeStr: string, availabilitySlots: { start_time: string; end_time: string }[] | null): boolean {
    if (!availabilitySlots || availabilitySlots.length === 0) return false;
    
    // Convert job times to minutes for comparison
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    const jobStartMinutes = startHour * 60 + startMin;
    const jobEndMinutes = endHour * 60 + endMin;
    
    // Check if this is an overnight job (end time is earlier in the day than start time)
    const isOvernight = jobEndMinutes < jobStartMinutes;
    
    if (isOvernight) {
        // For overnight jobs, the worker must be available:
        // 1. From the job start time until midnight on the first day
        // 2. From midnight until the job end time on the second day
        
        // Check for any availability slot that contains the start time through midnight
        const firstDayAvailable = availabilitySlots && availabilitySlots.some(slot => {
            const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
            const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
            const slotStartMinutes = slotStartHour * 60 + slotStartMin;
            const slotEndMinutes = slotEndHour * 60 + slotEndMin;
            
            // Check if slot covers from job start time to midnight (23:59)
            return jobStartMinutes >= slotStartMinutes && 
                   // Either the slot ends at midnight or extends to the next day
                   (slotEndMinutes >= 23 * 60 + 59 || slotEndMinutes < slotStartMinutes);
        });
        
        if (!firstDayAvailable) return false;
        
        // For the second day, we need to ensure there's an availability slot 
        // that starts at midnight (00:00) and extends at least to the job end time
        // We're assuming the UI only shows the worker's schedule for a single day,
        // so we can't actually verify this part entirely from the frontend.
        // For this reason, we're also relying on the backend SQL validation.
        
        // For simplicity, we'll return false for overnight jobs in the UI
        // to avoid showing workers who are likely unavailable on the next day
        return false;
    } else {
        // Regular same-day job - check if job time falls entirely within any availability slot
        return availabilitySlots.some(slot => {
            const [slotStartHour, slotStartMin] = slot.start_time.split(':').map(Number);
            const [slotEndHour, slotEndMin] = slot.end_time.split(':').map(Number);
            const slotStartMinutes = slotStartHour * 60 + slotStartMin;
            const slotEndMinutes = slotEndHour * 60 + slotEndMin;
            
            return jobStartMinutes >= slotStartMinutes && jobEndMinutes <= slotEndMinutes;
        });
    }
}

export function AssignmentForm({ clients: initialClients }: AssignmentFormProps) {
    const router = useRouter();
    const [isSubmitting, startSubmitting] = useTransition();
    const [isFetchingWorkers, startFetchingWorkers] = useTransition();
    
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientPhone, setNewClientPhone] = useState<string | undefined>("");
    const [newClientAddress, setNewClientAddress] = useState("");
    const [isCreatingClient, startCreatingClient] = useTransition();

    const [calculatedDuration, setCalculatedDuration] = useState<string | null>(null);
    const [workerSchedules, setWorkerSchedules] = useState<Record<string, WorkerSchedule | null>>({});
    const [schedulesLoading, setSchedulesLoading] = useState<Record<string, boolean>>({});

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: {
            title: "",
            description: "",
            clientId: "",
            scheduledAtTime: "09:00",
            scheduledEndTime: "10:00",
            duration: 60,
            assignedWorkerId: "",
            workItems: [{ value: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        name: "workItems",
        control: form.control,
    });

    const scheduledDate = form.watch("scheduledAtDate");
    const startTimeStr = form.watch("scheduledAtTime");
    const endTimeStr = form.watch("scheduledEndTime");
    const assignedWorkerId = form.watch("assignedWorkerId");

    useEffect(() => {
        if (availableWorkers.length > 0 && scheduledDate) {
            const dateString = scheduledDate.toISOString().split('T')[0];

            availableWorkers.forEach(worker => {
                setSchedulesLoading(prev => ({ ...prev, [worker.id]: true }));
                getWorkerScheduleAction(worker.id, dateString).then(result => {
                    if (result.success) {
                        setWorkerSchedules(prev => ({ ...prev, [worker.id]: result.schedule || null }));
                    } else {
                        toast.error(`Failed to fetch schedule for ${worker.name}.`, { description: result.error });
                        setWorkerSchedules(prev => ({ ...prev, [worker.id]: null }));
                    }
                }).finally(() => {
                    setSchedulesLoading(prev => ({ ...prev, [worker.id]: false }));
                });
            });
        }
    }, [availableWorkers, scheduledDate]);

    useEffect(() => {
        const calculateAndFetch = () => {
            if (scheduledDate && startTimeStr && endTimeStr) {
                const [startHour, startMinute] = startTimeStr.split(':').map(Number);
                const [endHour, endMinute] = endTimeStr.split(':').map(Number);

                const startTime = set(scheduledDate, { hours: startHour, minutes: startMinute, seconds: 0, milliseconds: 0 });
                let potentialEndTime = set(scheduledDate, { hours: endHour, minutes: endMinute, seconds: 0, milliseconds: 0 });

                let endTime = potentialEndTime;
                if (potentialEndTime.getTime() <= startTime.getTime()) {
                    endTime = addDays(potentialEndTime, 1);
                    // Add a warning toast for overnight jobs
                    toast.warning("Overnight Job Detected", {
                        description: "This job spans multiple days. Worker availability for overnight jobs is limited and may require manual verification.",
                        duration: 5000,
                    });
                }
                
                const durationInMinutes = differenceInMinutes(endTime, startTime);

                if (durationInMinutes > 0) {
                    form.setValue('duration', durationInMinutes, { shouldValidate: true });
                    setCalculatedDuration(formatDuration(durationInMinutes));

                    startFetchingWorkers(async () => {
                        setAvailableWorkers([]);
                         if (form.getValues('assignedWorkerId')) {
                           form.setValue('assignedWorkerId', '', { shouldValidate: true });
                        }
                        const result = await getAvailableWorkersAction(startTime.toISOString(), endTime.toISOString());
                        if (result.success) {
                            const fetchedWorkers = result.workers || [];
                            const mappedWorkers: Worker[] = fetchedWorkers.map((w: any) => ({
                                id: w.worker_id,
                                name: w.worker_name,
                                email: w.worker_email,
                                phone: w.worker_phone,
                                role: w.worker_role,
                                avatarUrl: null, // Assuming no avatar URL from this endpoint for now
                            }));
                            setAvailableWorkers(mappedWorkers);
                            setWorkerSchedules({}); // Clear old schedules
                        } else {
                            toast.error("Failed to get available workers.", { description: result.error });
                            setAvailableWorkers([]);
                        }
                    });
                } else {
                    form.setValue('duration', 0);
                    setCalculatedDuration("End time must be after start time.");
                    setAvailableWorkers([]);
                }
            } else {
                setAvailableWorkers([]);
                setCalculatedDuration(null);
            }
        };
        calculateAndFetch();
    }, [scheduledDate, startTimeStr, endTimeStr, form]);

    async function handleNewClient(e: React.FormEvent) {
        e.preventDefault();
        if (newClientName.trim().length < 2) {
            toast.error("Client name must be at least 2 characters.");
            return;
        }
        if (newClientEmail && !z.string().email().safeParse(newClientEmail).success) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (newClientPhone && !isPossiblePhoneNumber(newClientPhone)) {
            toast.error("Please enter a valid phone number.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newClientName.trim());
        formData.append('email', newClientEmail.trim());
        formData.append('phone', newClientPhone || "");
        formData.append('address', newClientAddress.trim());

        startCreatingClient(async () => {
            const result = await createClient(formData);
            if (result.success && result.client) {
                toast.success(`Client "${result.client.name}" created successfully.`);
                const newClient = { ...result.client, id: result.client.id, name: result.client.name };
                setClients((prev) => [...prev, newClient]);
                form.setValue("clientId", newClient.id, { shouldValidate: true });
                setNewClientName("");
                setNewClientEmail("");
                setNewClientPhone("");
                setNewClientAddress("");
                setIsClientDialogOpen(false);
            } else {
                 const errorMsg = result.error || "An unknown error occurred.";
                 toast.error("Failed to create client.", { description: errorMsg });
            }
        });
    }

    function onSubmit(data: AssignmentFormValues) {
        if (data.duration <= 0) {
            toast.error("Invalid schedule", { description: "End time must be after start time."});
            return;
        }
        startSubmitting(async () => {
            const { scheduledEndTime, ...rest } = data;
            const jobData = {
                ...rest,
                workItems: data.workItems?.map(item => item.value).filter(v => v.length > 0),
            };
            const result = await createJob(jobData);

            if (result.success) {
                toast.success("Job created successfully!");
                router.push("/dashboard/jobs");
            } else {
                const errorMsg = result.details?.fieldErrors ?
                    Object.values(result.details.fieldErrors).flat().join(', ') :
                    result.error || "An unexpected error occurred.";
                
                toast.error("Failed to create job", {
                    description: errorMsg,
                });
            }
        });
    }

    const clientIdField = form.watch('clientId');
    const selectedClient = clients.find(c => c.id === clientIdField);
    const selectedWorker = availableWorkers.find(w => w.id === assignedWorkerId);

    return (
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Building className="h-6 w-6" />
                                        <span>Job Details</span>
                                    </CardTitle>
                                    <CardDescription>Enter the main information for the new job.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                Job Title
                                            </FormLabel>
                                            <FormControl><Input placeholder="e.g., Spring Cleanup" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                 Description
                                            </FormLabel>
                                            <FormControl><Textarea placeholder="Add any notes or details for the job..." className="resize-none" {...field} value={field.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <ListChecks className="h-6 w-6" />
                                        <span>Work Items</span>
                                    </CardTitle>
                                    <CardDescription>Add a checklist of tasks for this job.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-3">
                                        {fields.map((field, index) => (
                                            <FormField
                                                key={field.id}
                                                control={form.control}
                                                name={`workItems.${index}.value`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center gap-2">
                                                            <FormControl>
                                                                <Input {...field} placeholder={`Work Item #${index + 1}`} />
                                                            </FormControl>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ value: "" })}>
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Item
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8 lg:sticky lg:top-8">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Users className="h-6 w-6" />
                                        <span>Client & Schedule</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                     <FormField control={form.control} name="clientId" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                Client
                                            </FormLabel>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? clients.find((c) => c.id === field.value)?.name : "Select a client"}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Search clients..." />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        <p className="p-4 text-sm text-muted-foreground">No client found.</p>
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {clients.map((c) => (
                                                                            <CommandItem value={c.name} key={c.id} onSelect={() => { form.setValue("clientId", c.id, { shouldValidate: true }); }}>
                                                                                <Check className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                                {c.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                 <DialogTrigger asChild>
                                                    <Button variant="outline" size="icon" className="shrink-0">
                                                        <PlusIcon className="h-4 w-4"/>
                                                    </Button>
                                                </DialogTrigger>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="scheduledAtDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                             <FormLabel className="flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                Date
                                            </FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? ( format(field.value, "PPP") ) : ( <span>Pick a date</span> )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                        initialFocus
                                                        modifiers={{ selected: field.value }}
                                                        modifiersClassNames={{ selected: 'job-day-selected' }}
                                                        classNames={{
                                                            root: "p-3",
                                                            caption_label: "text-lg font-medium",
                                                            head_cell: "w-10 font-semibold",
                                                            day: "h-10 w-10 text-base",
                                                            nav_button: "h-10 w-10",
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="scheduledAtTime" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    Start Time
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                         <FormField control={form.control} name="scheduledEndTime" render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    End Time
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="time" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    {calculatedDuration && (
                                        <FormDescription>
                                            Total duration: <span className="font-semibold">{calculatedDuration}</span>
                                            {startTimeStr && endTimeStr && timeToMinutes(endTimeStr) < timeToMinutes(startTimeStr) && (
                                                <div className="mt-2 flex items-center space-x-2 text-amber-600 dark:text-amber-500">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <span>This is an overnight job spanning multiple days.</span>
                                                </div>
                                            )}
                                        </FormDescription>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Briefcase className="h-6 w-6" />
                                        <span>Assign Worker</span>
                                    </CardTitle>
                                    <CardDescription>
                                        {isFetchingWorkers ? "Loading available workers..." : (availableWorkers.length > 0 ? "Select an available worker from the list below." : "No workers available for this time.")}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <FormField
                                        control={form.control}
                                        name="assignedWorkerId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    className="grid grid-cols-1 gap-2"
                                                >
                                                    {isFetchingWorkers ? (
                                                        <div key="loader" className="flex items-center justify-center p-4">
                                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : availableWorkers.length > 0 ? (
                                                        availableWorkers.map((worker) => {
                                                            const schedule = workerSchedules[worker.id];
                                                            const isSelectable = schedule ? isTimeWithinAvailability(startTimeStr, endTimeStr, schedule.daily_availability_slots) : false;
                                                            const potentialBooking = startTimeStr && endTimeStr ? { start_time: startTimeStr, end_time: endTimeStr } : undefined;
                                                            
                                                            return (
                                                                <FormItem key={worker.id} className="w-full">
                                                                    <FormControl>
                                                                        <Label 
                                                                            htmlFor={worker.id} 
                                                                            className={cn(
                                                                                "font-medium flex-1 w-full",
                                                                                isSelectable ? "cursor-pointer" : "cursor-not-allowed"
                                                                            )}
                                                                        >
                                                                            <RadioGroupItem 
                                                                                value={worker.id} 
                                                                                id={worker.id} 
                                                                                className="sr-only" 
                                                                                disabled={!isSelectable} 
                                                                            />
                                                                            <div className={cn(
                                                                                "flex flex-col items-start gap-4 p-4 rounded-xl border-2 transition-all",
                                                                                field.value === worker.id 
                                                                                    ? "bg-emerald-50/50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700" 
                                                                                    : "border-muted/30",
                                                                                isSelectable 
                                                                                    ? "hover:bg-accent hover:border-accent-foreground/20"
                                                                                    : "bg-muted/20 border-dashed opacity-70"
                                                                            )}>
                                                                                <div className="flex items-center gap-4 w-full">
                                                                                    <Avatar className="h-12 w-12">
                                                                                        <AvatarImage src={worker.avatarUrl ?? undefined} alt={worker.name} />
                                                                                        <AvatarFallback className="text-lg">{getInitials(worker.name)}</AvatarFallback>
                                                                                    </Avatar>
                                                                                    <div className="flex-1">
                                                                                        <p className="font-bold text-base">{worker.name}</p>
                                                                                        <p className="text-sm text-muted-foreground">{worker.role || "Team Member"}</p>
                                                                                    </div>
                                                                                    <Check className={cn("h-6 w-6 text-emerald-500 transition-opacity", field.value === worker.id ? "opacity-100" : "opacity-0")} />
                                                                                </div>
                                                                                <WorkerScheduleDisplay 
                                                                                    worker={worker}
                                                                                    schedule={workerSchedules[worker.id] ?? null}
                                                                                    isLoading={schedulesLoading[worker.id] ?? false}
                                                                                    isSelected={field.value === worker.id}
                                                                                    scheduledDate={scheduledDate}
                                                                                    potentialBooking={potentialBooking}
                                                                                    isSelectable={isSelectable}
                                                                                />
                                                                            </div>
                                                                        </Label>
                                                                    </FormControl>
                                                                    <FormMessage className="pt-2" />
                                                                </FormItem>
                                                            );
                                                        })
                                                    ) : (
                                                        <div key="no-workers" className="text-sm text-muted-foreground text-center p-4 border rounded-lg bg-background">
                                                            No workers available for this time. Adjust the schedule to see options.
                                                        </div>
                                                    )}
                                                </RadioGroup>
                                                <FormMessage className="pt-2" />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {selectedWorker && selectedClient && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <FileText className="h-6 w-6" />
                                        <span>Job Preview</span>
                                    </CardTitle>
                                    <CardDescription>Review the details before creating the job.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm font-medium pt-6">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Client:</span>
                                        <span className="text-foreground">{selectedClient.name}</span>
                                    </div>
                                     <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> Worker:</span>
                                        <span className="text-foreground">{selectedWorker.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><CalendarIcon className="h-4 w-4" /> Date:</span>
                                        <span className="text-foreground">{scheduledDate ? format(scheduledDate, "PPP") : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Time:</span>
                                        <span className="text-foreground">{startTimeStr} - {endTimeStr}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" /> Duration:</span>
                                        <span className="text-foreground">{calculatedDuration}</span>
                                    </div>
                                    {form.getValues('workItems') && form.getValues('workItems')!.filter(i => i.value).length > 0 && (
                                        <div className="pt-2">
                                            <p className="flex items-center gap-2 text-muted-foreground mb-2"><ListChecks className="h-4 w-4" /> Work Items:</p>
                                            <ul className="space-y-1 pl-2">
                                                 {form.getValues('workItems')?.map((item, index) => item.value && (
                                                    <li key={index} className="flex items-center gap-2">
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-foreground">{item.value}</span>
                                                    </li>
                                                 ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            )}

                        </div>
                    </div>
                    <div className="flex justify-end pt-8">
                        <Button type="submit" size="lg" disabled={isSubmitting || !clientIdField || !assignedWorkerId}>
                            {isSubmitting ? (
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <PlusIcon className="mr-2 h-4 w-4" />
                            )}
                            {isSubmitting ? "Creating Job..." : "Create Job"}
                        </Button>
                    </div>
                </form>
            </Form>

            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <Users className="h-7 w-7" />
                        Create a New Client
                    </DialogTitle>
                    <DialogDescription>
                        Add a new client to your database. This client will be automatically selected after creation.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleNewClient}>
                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="new-client-name" className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4" />
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="new-client-name"
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="e.g., Acme Inc."
                                required
                                className="text-base"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="new-client-email" className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4" />
                                Email
                            </Label>
                            <Input
                                id="new-client-email"
                                type="email"
                                value={newClientEmail}
                                onChange={(e) => setNewClientEmail(e.target.value)}
                                placeholder="e.g., contact@acme.com"
                                className="text-base"
                            />
                        </div>
                         <div className="space-y-2">
                             <Label htmlFor="new-client-phone" className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4" />
                                Phone
                            </Label>
                            <PhoneInput
                                id="new-client-phone"
                                international
                                countryCallingCodeEditable={false}
                                defaultCountry="US"
                                value={newClientPhone}
                                onChange={setNewClientPhone}
                                className="input text-base"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-client-address" className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4" />
                                Address
                            </Label>
                            <Textarea
                                id="new-client-address"
                                value={newClientAddress}
                                onChange={(e) => setNewClientAddress(e.target.value)}
                                placeholder="e.g., 123 Main St, Anytown, USA 12345 or N/A"
                                className="text-base"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-6">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isCreatingClient}>
                             {isCreatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             {isCreatingClient ? "Saving Client..." : "Save Client"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 