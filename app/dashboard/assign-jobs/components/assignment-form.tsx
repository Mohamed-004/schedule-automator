"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Check, ChevronsUpDown, PlusIcon, Trash2, User, Clock, Loader2, Award, Briefcase, FileText, ListChecks, Users, ChevronRight, Building, Mail, Phone, AlertTriangle, MapPin, Star, StarHalf, BadgeCheck, History, Scale, Heart, Zap } from "lucide-react";
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
import { createJob, getAvailableWorkersAction, createNewClient, getWorkerScheduleAction, getRecommendedWorkersAction } from "../actions";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import "react-phone-number-input/style.css";
import PhoneInput, { isPossiblePhoneNumber } from "react-phone-number-input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Fragment } from "react";
import "../worker-card.css";

const assignmentFormSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters."),
    description: z.string().optional(),
    clientId: z.string().uuid({ message: "Please select a client." }),
    scheduledAtDate: z.date({ required_error: "A date is required." }),
    scheduledAtTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
    scheduledEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Please use HH:MM.'),
    duration: z.coerce.number().int().positive("Duration must be calculated."),
    assignedWorkerId: z.string().uuid({ message: "Please select a worker." }).or(z.literal("")),
    workItems: z.array(z.object({ value: z.string().min(1, "Item description cannot be empty.") })).min(1, "At least one work item is required."),
    jobTypeId: z.string().uuid({ message: "Please select a job type." }).optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface Client {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    isAvailable?: boolean;
}

interface JobType {
    id: string;
    name: string;
    description?: string | null;
    requiredSkills?: string[] | null;
}

interface Worker {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    avatarUrl?: string | null;
    recommendationScore?: number;
    skillMatch?: boolean;
    clientPreferred?: boolean;
    balancedWorkload?: boolean;
    hasRatings?: boolean;
    avgRating?: number;
    availabilityScore?: number;
    isAvailable?: boolean;
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
    workers?: Worker[];
    jobTypes?: JobType[];
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
    conflictReason,
}: {
    availability: { start_time: string; end_time: string }[] | null;
    booked: { title: string; start_time: string; end_time: string }[] | null;
    potentialBooking?: { start_time: string; end_time: string };
    isPotentialBookingValid?: boolean;
    conflictReason?: 'availability' | 'booking' | null;
}) {
    // Fixed hours to match the image exactly
    const displayHours = [6, 8, 10, 12, 14, 16, 18, 20];
    const START_HOUR = 6;
    const END_HOUR = 20;
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

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground">
                {displayHours.map(hour => (
                    <div key={hour}>
                        {format(set(new Date(), { hours: hour }), hour === 12 ? 'haa' : 'ha').toUpperCase()}
                    </div>
                ))}
            </div>
            <div className="relative w-full h-3 mt-2 bg-gray-200 rounded-full overflow-hidden">
                {/* Available slots */}
                {availabilityMinutes.map((slot, i) => (
                    <TooltipProvider key={`avail-${i}`} delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="absolute top-0 h-full rounded-full"
                                    style={{
                                        backgroundColor: 'rgba(16,185,129,0.7)',
                                        left: `${((slot.start / 60) - START_HOUR) / (END_HOUR - START_HOUR) * 100}%`,
                                        width: `${(slot.end - slot.start) / 60 / (END_HOUR - START_HOUR) * 100}%`,
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
                                    className="absolute top-0 h-full bg-blue-500 rounded-full"
                                    style={{
                                        left: `${((slot.start / 60) - START_HOUR) / (END_HOUR - START_HOUR) * 100}%`,
                                        width: `${(slot.end - slot.start) / 60 / (END_HOUR - START_HOUR) * 100}%`,
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>{slot.title}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}

                {/* Potential Booking / Conflict */}
                {potentialBooking && timeToMinutes(potentialBooking.end_time) > timeToMinutes(potentialBooking.start_time) && (
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={cn(
                                        "absolute top-0 h-full rounded-full z-10",
                                        !isPotentialBookingValid && conflictReason === 'booking' ? "bg-red-400/70 border border-red-500" :
                                        isPotentialBookingValid ? "bg-purple-400/60" : "bg-red-400/50"
                                    )}
                                    style={{
                                        left: `${((timeToMinutes(potentialBooking.start_time) / 60) - START_HOUR) / (END_HOUR - START_HOUR) * 100}%`,
                                        width: `${(timeToMinutes(potentialBooking.end_time) - timeToMinutes(potentialBooking.start_time)) / 60 / (END_HOUR - START_HOUR) * 100}%`,
                                    }}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Potential Job: {formatTime(potentialBooking.start_time)} - {formatTime(potentialBooking.end_time)}</p>
                                {!isPotentialBookingValid && <p className="font-semibold text-red-600 dark:text-red-400">Conflicts with worker's schedule.</p>}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex items-center justify-end gap-4 text-xs pt-2.5">
                <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-200"></span>Unavailable</div>
                <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#10B981]/70"></span>Available</div>
                <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span>Booked</div>
                {potentialBooking && (
                    <div className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-purple-400/60"></span>Potential</div>
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

function WorkerScheduleDisplay({ worker, schedule, isLoading, isSelected, scheduledDate, potentialBooking, isSelectable, conflictReason }: { 
    worker: Worker, 
    schedule: WorkerSchedule | null, 
    isLoading: boolean, 
    isSelected: boolean, 
    scheduledDate: Date | undefined,
    potentialBooking?: { start_time: string; end_time: string },
    isSelectable: boolean,
    conflictReason: 'availability' | 'booking' | null,
}) {
    if (!scheduledDate) {
         return (
            <div className="text-sm text-center text-muted-foreground py-4">
                Select a date to see worker schedules.
            </div>
        );
    }
    
    const isUnavailableAllDay = schedule?.daily_exception_reason && !schedule.exception_start_time;

    const effectiveAvailability = (schedule && schedule.exception_start_time && schedule.exception_end_time)
        ? [{ start_time: schedule.exception_start_time, end_time: schedule.exception_end_time }]
        : (schedule ? schedule.daily_availability_slots : null);
    
    return (
        <div className={cn("w-full space-y-4 pt-4 mt-4 border-t", isSelected ? "border-blue-200" : "border-gray-200")}>
            {isLoading ? (
                <div className="flex items-center justify-center text-sm text-muted-foreground py-4">
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    <span>Loading schedule...</span>
                </div>
            ) : schedule ? (
                <div className="space-y-4 rounded-lg bg-slate-50/50 py-4 border border-slate-200/80">
                    <div className="px-4">
                        {conflictReason && potentialBooking && !isSelectable && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Scheduling Conflict</AlertTitle>
                                <AlertDescription>
                                    {conflictReason === 'availability' && `The selected time is outside this worker's available hours.`}
                                    {conflictReason === 'booking' && `This time conflicts with an existing job in the worker's schedule.`}
                                </AlertDescription>
                            </Alert>
                        )}
                        {schedule.daily_exception_reason && (
                            <Alert variant="default" className={cn(
                              "rounded-md border",
                              isUnavailableAllDay 
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-blue-50 border-blue-200 text-blue-800"
                            )}>
                                <AlertTriangle className={cn("h-4 w-4", isUnavailableAllDay ? "text-amber-500" : "text-blue-500")} />
                                <AlertTitle className="font-semibold">
                                    {isUnavailableAllDay ? "Worker Unavailable" : "Schedule Note"}
                                </AlertTitle>
                                <AlertDescription className="text-current/90">
                                    {schedule.daily_exception_reason}
                                    {schedule.exception_start_time && schedule.exception_end_time && (
                                         <div className="mt-2">
                                            <p className="font-semibold flex items-center gap-2">
                                                <Clock className="h-4 w-4" /> 
                                                Available: 
                                                <span className="font-mono text-xs bg-white text-blue-800 px-2 py-1 rounded-md border border-blue-200 shadow-sm">
                                                    {formatTime(schedule.exception_start_time)} - {formatTime(schedule.exception_end_time)}
                                                </span>
                                            </p>
                                         </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
                        {/* Weekly Hours Card */}
                        <div className="rounded-lg bg-white p-3 space-y-2 border border-gray-200/80 shadow-sm">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4 text-indigo-500" />
                                    <span>Weekly Hours</span>
                                </div>
                                <span className="font-semibold text-gray-800">
                                    {(schedule.weekly_hours_worked ?? 0).toFixed(1)}h / {(schedule.weekly_hours_goal ?? 0).toFixed(1)}h
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200">
                                <div 
                                    className="h-1.5 rounded-full bg-indigo-500" 
                                    style={{ width: `${Math.min(100, ((schedule.weekly_hours_worked ?? 0) / (schedule.weekly_hours_goal || 1)) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Math.round(((schedule.weekly_hours_worked ?? 0) / (schedule.weekly_hours_goal || 1)) * 100)}% utilized
                            </p>
                        </div>
                        
                        {/* Today's Load Card */}
                        <div className="rounded-lg bg-white p-3 space-y-2 border border-gray-200/80 shadow-sm">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4 text-teal-500" />
                                    <span>Today's Load</span>
                                </div>
                                <span className="font-semibold text-gray-800">
                                    {(schedule.daily_hours_worked ?? 0).toFixed(1)}h / {(schedule.daily_hours_goal ?? 0).toFixed(1)}h
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-200">
                                <div 
                                    className="h-1.5 rounded-full bg-teal-500" 
                                    style={{ width: `${Math.min(100, ((schedule.daily_hours_worked ?? 0) / (schedule.daily_hours_goal || 1)) * 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {Math.round(((schedule.daily_hours_worked ?? 0) / (schedule.daily_hours_goal || 1)) * 100)}% utilized
                            </p>
                        </div>
                    </div>

                    {/* Today's Schedule section */}
                    <div className="space-y-2 pt-2 px-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">Today's Schedule</p>
                        </div>
                        {isUnavailableAllDay ? (
                            <div className="text-center text-muted-foreground italic py-8 border rounded-lg border-dashed bg-background">
                                <p>This worker is unavailable for the entire day.</p>
                            </div>
                        ) : (
                            <DailyScheduleVisualizer 
                                availability={effectiveAvailability}
                                booked={schedule.daily_schedule}
                                potentialBooking={potentialBooking}
                                isPotentialBookingValid={isSelectable}
                                conflictReason={conflictReason}
                            />
                        )}
                    </div>
                </div>
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

function hasTimeConflict(startTimeStr: string, endTimeStr: string, bookedSlots: { start_time: string; end_time: string }[] | null): boolean {
    if (!bookedSlots || bookedSlots.length === 0) return false;

    const jobStartMinutes = timeToMinutes(startTimeStr);
    const jobEndMinutes = timeToMinutes(endTimeStr);

    if (jobEndMinutes <= jobStartMinutes) {
        // For now, front-end validation will simplify and not check conflicts for overnight jobs,
        // relying on backend validation as the source of truth for these complex cases.
        return false;
    }

    return bookedSlots.some(slot => {
        // Booked slots have full ISO strings for start_time and end_time
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
        const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
        
        // Simple overlap check: (StartA < EndB) and (EndA > StartB)
        return jobStartMinutes < slotEndMinutes && jobEndMinutes > slotStartMinutes;
    });
}

interface Highlight {
    icon: React.ElementType;
    text: string;
    tooltip: string;
}

function RecommendationHighlights({ worker, isTopRecommended }: { worker: Worker; isTopRecommended: boolean }) {
    const highlights: Highlight[] = [];

    if (worker.clientPreferred) {
        highlights.push({
            icon: History,
            text: 'Past Client History',
            tooltip: 'This worker has previously worked for this client.'
        });
    }

    if (worker.skillMatch) {
        highlights.push({
            icon: BadgeCheck,
            text: 'Skill Match',
            tooltip: 'The worker possesses the skills required for this job type.'
        });
    }

    if (worker.balancedWorkload) {
        highlights.push({
            icon: Scale,
            text: 'Good Capacity',
            tooltip: 'This worker has a balanced schedule and can take on more work.'
        });
    }
    
    if (worker.hasRatings && worker.avgRating && worker.avgRating >= 4.5) {
        highlights.push({
            icon: Star,
            text: 'Top Rated',
            tooltip: `This worker has an average rating of ${worker.avgRating.toFixed(1)} stars.`
        });
    }

    if (highlights.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 pt-4 border-t border-gray-200/80">
            {isTopRecommended && (
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Why Recommended?</h4>
            )}
            <div className="flex flex-wrap gap-2">
                {highlights.map((highlight) => (
                    <TooltipProvider key={highlight.text}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-1">
                                    <highlight.icon className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-semibold text-gray-800">{highlight.text}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{highlight.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    );
}

function getMatchScoreColor(score: number | null | undefined): string {
    if (score == null) return "bg-gray-100 text-gray-700 border-gray-200";
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
}

function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function AssignmentForm({ clients: initialClients, workers: initialWorkers = [], jobTypes: initialJobTypes = [] }: AssignmentFormProps) {
    const router = useRouter();
    const [isSubmitting, startSubmitting] = useTransition();
    const [isFetchingWorkers, startFetchingWorkers] = useTransition();
    
    const [clients, setClients] = useState<Client[]>(initialClients);
    const [availableWorkers, setAvailableWorkers] = useState<Worker[]>(initialWorkers);
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [newClientName, setNewClientName] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientPhone, setNewClientPhone] = useState<string | undefined>("");
    const [newClientAddress, setNewClientAddress] = useState("");
    const [isCreatingClient, startCreatingClient] = useTransition();

    const [calculatedDuration, setCalculatedDuration] = useState<string | null>(null);
    const [workerSchedules, setWorkerSchedules] = useState<Record<string, WorkerSchedule | null>>({});
    const [schedulesLoading, setSchedulesLoading] = useState<Record<string, boolean>>({});
    const [jobTypes, setJobTypes] = useState<JobType[]>(initialJobTypes);
    
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
            jobTypeId: "",
        },
    });

    // Handle URL parameters for pre-filling from Quick Assign
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const prefill = urlParams.get('prefill');
        
        if (prefill === 'true') {
            const workerId = urlParams.get('workerId');
            const workerName = urlParams.get('workerName');
            const scheduledDate = urlParams.get('scheduledDate');
            const scheduledTime = urlParams.get('scheduledTime');
            const duration = urlParams.get('duration');
            
            if (scheduledDate && scheduledTime && duration) {
                // Set the date
                form.setValue('scheduledAtDate', new Date(scheduledDate));
                
                // Set the time
                form.setValue('scheduledAtTime', scheduledTime);
                
                // Calculate end time based on duration
                const [hours, minutes] = scheduledTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + parseInt(duration);
                const endHours = Math.floor(endMinutes / 60) % 24;
                const endMins = endMinutes % 60;
                const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
                
                form.setValue('scheduledEndTime', endTimeStr);
                form.setValue('duration', parseInt(duration));
                
                // Set calculated duration display
                setCalculatedDuration(formatDuration(parseInt(duration)));
                
                // Pre-select worker if provided
                if (workerId) {
                    form.setValue('assignedWorkerId', workerId);
                }
                
                // Show success message
                toast.success('Form pre-filled from worker swap', {
                    description: workerName ? `Ready to assign job to ${workerName}` : 'Job details have been pre-filled'
                });
                
                // Clear URL parameters to clean up the URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [form]);

    const { fields, append, remove } = useFieldArray({
        name: "workItems",
        control: form.control,
    });

    const scheduledDate = form.watch("scheduledAtDate");
    const startTimeStr = form.watch("scheduledAtTime");
    const endTimeStr = form.watch("scheduledEndTime");
    const assignedWorkerId = form.watch("assignedWorkerId");
    const jobTypeId = form.watch("jobTypeId");

    const reviewSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (availableWorkers.length > 0 && scheduledDate) {
            const dateString = scheduledDate.toISOString().split('T')[0];

            availableWorkers.forEach(worker => {
                setSchedulesLoading(prev => ({ ...prev, [worker.id]: true }));
                getWorkerScheduleAction(worker.id, dateString).then(result => {
                    if (result.success) {
                        // Add console log to debug the worker schedule data
                        console.log(`Worker schedule for ${worker.name}:`, result.schedule);
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
                        
                        const clientId = form.getValues('clientId');
                        const jobType = form.getValues('jobTypeId');
                        
                        if (clientId) {
                            const result = await getRecommendedWorkersAction(
                                startTime.toISOString(), 
                                endTime.toISOString(),
                                clientId,
                                jobType || undefined
                            );
                            
                            if (result.success) {
                                const fetchedWorkers = result.workers || [];
                                
                                const mappedWorkers: Worker[] = fetchedWorkers.map((w: any) => {
                                    // Always clean the worker name to remove any trailing numbers
                                    const cleanName = typeof w.worker_name === 'string' 
                                        ? w.worker_name.replace(/\s+\d+$/, '') 
                                        : w.worker_name || "Unknown Worker";
                                    
                                    return {
                                        id: w.worker_id,
                                        name: cleanName, // Use cleaned name
                                        email: w.worker_email,
                                        phone: w.worker_phone,
                                        role: w.worker_role,
                                        avatarUrl: null,
                                        recommendationScore: w.recommendation_score,
                                        skillMatch: w.skill_match,
                                        clientPreferred: w.client_preferred,
                                        balancedWorkload: w.balanced_workload,
                                        hasRatings: w.has_ratings,
                                        avgRating: w.avg_rating,
                                        availabilityScore: w.availability_score,
                                        isAvailable: true,
                                    };
                                });
                                
                                // Sort workers by recommendation score DESCENDING before setting state
                                const sortedWorkers = mappedWorkers.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));

                                setAvailableWorkers(sortedWorkers);
                                setWorkerSchedules({}); // Clear old schedules
                            } else {
                                toast.error("Failed to get recommended workers.", { description: result.error });
                                setAvailableWorkers([]);
                            }
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
    }, [scheduledDate, startTimeStr, endTimeStr, form.watch('clientId'), form.watch('jobTypeId')]);

    const clientIdField = form.watch('clientId');
    const selectedClient = clients.find(c => c.id === clientIdField);
    const selectedWorker = availableWorkers.find(w => w.id === assignedWorkerId);

    useEffect(() => {
        // Only scroll if a worker is selected, client is selected, and the worker is selectable
        const schedule = selectedWorker ? workerSchedules[selectedWorker.id] : null;
        
        let isSelectable = false;
        if (schedule) {
            const effectiveAvailability = (schedule.exception_start_time && schedule.exception_end_time)
                ? [{ start_time: schedule.exception_start_time, end_time: schedule.exception_end_time }]
                : schedule.daily_availability_slots;
                
            const isWithinAvailability = isTimeWithinAvailability(startTimeStr, endTimeStr, effectiveAvailability);
            const conflictsWithBooking = hasTimeConflict(startTimeStr, endTimeStr, schedule.daily_schedule);
            isSelectable = isWithinAvailability && !conflictsWithBooking;
        }
        
        if (selectedWorker && selectedClient && isSelectable && reviewSectionRef.current) {
            // Small delay to ensure DOM has updated
            setTimeout(() => {
                reviewSectionRef.current?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    }, [assignedWorkerId, clientIdField, workerSchedules, startTimeStr, endTimeStr]);

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
            const result = await createNewClient(formData);
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

    return (
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-xl">
                                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">1</span>
                                        <span>Define the Job</span>
                                    </CardTitle>
                                    <CardDescription>Start by providing the essential details for the job below.</CardDescription>
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
                                    <FormField control={form.control} name="jobTypeId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                Job Type
                                            </FormLabel>
                                            <div className="flex-1">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                                {field.value ? jobTypes.find((jt) => jt.id === field.value)?.name : "Select a job type"}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search job types..." />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <p className="p-4 text-sm text-muted-foreground">No job type found.</p>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {jobTypes.map((jt) => (
                                                                        <CommandItem value={jt.name} key={jt.id} onSelect={() => { 
                                                                            form.setValue("jobTypeId", jt.id, { shouldValidate: true }); 
                                                                        }}>
                                                                            <Check className={cn("mr-2 h-4 w-4", jt.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            {jt.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <ListChecks className="h-6 w-6 text-gray-500" />
                                        <span>Work Items</span>
                                    </CardTitle>
                                    <CardDescription>Add a checklist of mandatory tasks for this job.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <FormField
                                                key={field.id}
                                                control={form.control}
                                                name={`workItems.${index}.value`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-semibold text-gray-500">{index + 1}.</span>
                                                            <FormControl>
                                                                <Input {...field} placeholder={`Enter task description...`} />
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
                                        Add Task
                                    </Button>
                                    <FormMessage>{form.formState.errors.workItems?.message}</FormMessage>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-8 lg:sticky lg:top-8">
                             <Card className="relative p-4 max-w-full min-w-0 w-full bg-white border border-gray-200 rounded-lg shadow-[0_2px_8px_0_rgba(0,0,0,0.05)] overflow-hidden">
                                <CardHeader className="relative pb-4">
                                    <CardTitle className="flex items-center gap-3 text-xl">
                                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">2</span>
                                        <span>Set Client & Schedule</span>
                                    </CardTitle>
                                    <CardDescription>Choose a client and time. This will filter available workers.</CardDescription>
                                </CardHeader>
                                <CardContent className="relative space-y-6">
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
                                                <PopoverContent className="w-auto p-0 rounded-xl shadow-lg bg-white border border-blue-100">
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
                                                            day: "h-10 w-10 text-base rounded-lg hover:bg-blue-50 focus:bg-blue-100",
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

                            <Card className="relative p-4 max-w-full min-w-0 w-full bg-white border border-gray-200 rounded-lg shadow-[0_2px_8px_0_rgba(0,0,0,0.05)] overflow-hidden">
                                <CardHeader className="relative pb-4">
                                    <CardTitle className="flex items-center gap-3 text-xl">
                                       <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">3</span>
                                        <span>Assign a Worker</span>
                                    </CardTitle>
                                    <CardDescription>
                                        {isFetchingWorkers 
                                            ? "Finding recommended workers for this schedule..." 
                                            : availableWorkers.length > 0 
                                                ? "Select a worker. Recommendations are sorted by best match." 
                                                : "Please select a client and schedule to see recommendations."}
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent className="relative space-y-6">
                                     {!clientIdField || !scheduledDate ? (
                                        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg bg-slate-50/50">
                                            <p className="font-semibold">Complete Previous Steps</p>
                                            <p className="mt-2 text-sm">Please select a client and set a schedule to see recommended workers.</p>
                                        </div>
                                     ) : (
                                        <FormField
                                            control={form.control}
                                            name="assignedWorkerId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        className="grid grid-cols-1 gap-4"
                                                    >
                                                        {isFetchingWorkers ? (
                                                            <div key="loader" className="flex items-center justify-center p-4">
                                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                            </div>
                                                        ) : availableWorkers.length > 0 ? (
                                                            availableWorkers.map((worker, index) => {
                                                                const schedule = workerSchedules[worker.id];
                                                                
                                                                let conflictReason: 'availability' | 'booking' | null = null;
                                                                let isSelectable = false;

                                                                if (schedule) {
                                                                    const effectiveAvailability = (schedule.exception_start_time && schedule.exception_end_time)
                                                                        ? [{ start_time: schedule.exception_start_time, end_time: schedule.exception_end_time }]
                                                                        : schedule.daily_availability_slots;
                                                                    
                                                                    const isWithinAvailability = isTimeWithinAvailability(startTimeStr, endTimeStr, effectiveAvailability);
                                                                    const conflictsWithBooking = hasTimeConflict(startTimeStr, endTimeStr, schedule.daily_schedule);

                                                                    if (!isWithinAvailability) {
                                                                        conflictReason = 'availability';
                                                                    } else if (conflictsWithBooking) {
                                                                        conflictReason = 'booking';
                                                                    }
                                                                    isSelectable = isWithinAvailability && !conflictsWithBooking;
                                                                }
                                                                
                                                                const potentialBooking = startTimeStr && endTimeStr ? { start_time: startTimeStr, end_time: endTimeStr } : undefined;
                                                                
                                                                const isTopRecommended = index === 0 && (worker.recommendationScore || 0) > 0;
                                                                
                                                                return (
                                                                <FormItem key={worker.id} className="w-full">
                                                                    <FormControl>
                                                                        <Label 
                                                                            htmlFor={worker.id} 
                                                                            className={cn(
                                                                                "block w-full font-medium",
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
                                                                                "bg-white rounded-lg p-4 border transition-all",
                                                                                field.value === worker.id 
                                                                                    ? "border-blue-500 ring-2 ring-blue-200 shadow-md" 
                                                                                    : "border-gray-200 hover:border-gray-300",
                                                                                !isSelectable && "opacity-60 bg-gray-50",
                                                                            )}>
                                                                                <div className="flex items-start gap-4">
                                                                                    <div className="relative flex-shrink-0 worker-card-item">
                                                                                        <Avatar className="h-12 w-12 rounded-full">
                                                                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                                                                                                {getInitials(toTitleCase(worker.name))}
                                                                                            </AvatarFallback>
                                                                                        </Avatar>
                                                                                        {isTopRecommended && (
                                                                                            <div className="absolute -top-1 -right-2 bg-yellow-400 rounded-full p-1 shadow">
                                                                                                <Award className="h-4 w-4 text-white" />
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 worker-card-item">
                                                                                            <p className="font-bold text-base text-gray-800 truncate">{toTitleCase(worker.name)}</p>
                                                                                            {isTopRecommended && (
                                                                                                <Badge variant="default" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none shadow-sm font-semibold text-xs py-1 px-2.5">
                                                                                                    <Star className="h-3.5 w-3.5 mr-1.5" />
                                                                                                    Recommended
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-sm text-gray-500 mt-0.5">{worker.role || "Professional Technician"}</p>
                                                                                        
                                                                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                                                                            {worker.recommendationScore != null && (
                                                                                                <Badge variant="outline" className={cn("text-xs font-semibold", getMatchScoreColor(worker.recommendationScore))}>
                                                                                                    <Zap className="h-3 w-3 mr-1.5" />
                                                                                                    Match: {Math.round(worker.recommendationScore)}%
                                                                                                </Badge>
                                                                                            )}
                                                                                            {/* This is a placeholder for a real skill */}
                                                                                            <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                                                                Skill Name
                                                                                            </Badge>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <RecommendationHighlights worker={worker} isTopRecommended={isTopRecommended} />

                                                                                <WorkerScheduleDisplay 
                                                                                    worker={worker}
                                                                                    schedule={workerSchedules[worker.id] ?? null}
                                                                                    isLoading={schedulesLoading[worker.id] ?? false}
                                                                                    isSelected={field.value === worker.id}
                                                                                    scheduledDate={scheduledDate}
                                                                                    potentialBooking={potentialBooking}
                                                                                    isSelectable={isSelectable}
                                                                                    conflictReason={conflictReason}
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
                                     )}
                                </CardContent>
                            </Card>

                            {selectedWorker && selectedClient && (
                            <div id="review-section" ref={reviewSectionRef}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-xl">
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-bold text-lg">4</span>
                                            <span>Review and Create</span>
                                        </CardTitle>
                                        <CardDescription>Review the details below. If everything is correct, create the job.</CardDescription>
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
                                            <div className="pt-4 mt-4 border-t">
                                                <p className="font-semibold text-gray-800 mb-2">Work Items</p>
                                                <ul className="space-y-2">
                                                     {form.getValues('workItems')?.map((item, index) => item.value && (
                                                        <li key={index} className="flex items-start gap-3">
                                                            <span className="font-semibold text-blue-600">{index + 1}.</span>
                                                            <span className="text-gray-700">{item.value}</span>
                                                        </li>
                                                     ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            )}

                        </div>
                    </div>
                    <div className="flex justify-end pt-8">
                        <Button type="submit" size="lg" disabled={isSubmitting || !clientIdField || !assignedWorkerId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-transform duration-150 ease-in-out hover:scale-[1.02]">
                            {isSubmitting ? (
                                <>
                               <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Job...
                                </>
                            ) : "Create Job"}
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