import { useState, useEffect } from 'react';
import { AvailabilityExceptionInput } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilityExceptionFormProps {
  initialData: AvailabilityExceptionInput | null;
  onSave: (data: AvailabilityExceptionInput) => void;
  onCancel: () => void;
  isLoading: boolean;
  existingExceptionDates?: Date[];
}

const ExceptionTypeToggle = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => {
    return (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-200 p-1">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={cn(
                    "flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                    value ? "bg-white text-green-700 shadow" : "bg-transparent text-gray-600 hover:bg-gray-50"
                )}
            >
                <Sun className={cn("h-5 w-5", value ? "text-green-500" : "text-gray-400")} />
                Special Availability
            </button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={cn(
                    "flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium transition-all",
                    !value ? "bg-white text-red-700 shadow" : "bg-transparent text-gray-600 hover:bg-gray-50"
                )}
            >
                <Moon className={cn("h-5 w-5", !value ? "text-red-500" : "text-gray-400")} />
                Time Off
            </button>
        </div>
    );
};

export function AvailabilityExceptionForm({ initialData, onSave, onCancel, isLoading, existingExceptionDates = [] }: AvailabilityExceptionFormProps) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [date, setDate] = useState<Date | undefined>();
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setIsAvailable(initialData.isAvailable);
      setDate(initialData.date ? new Date(initialData.date) : undefined);
      setAllDay(initialData.allDay ?? true);
      setStartTime(initialData.startTime || '09:00');
      setEndTime(initialData.endTime || '17:00');
      setReason(initialData.reason || '');
    } else {
      // Reset for new form
      setIsAvailable(true);
      setDate(undefined);
      setAllDay(true);
      setStartTime('09:00');
      setEndTime('17:00');
      setReason('');
    }
    setDateError(null);
    setTimeError(null);
  }, [initialData]);

  // When switching to "Special Availability", force specific times.
  useEffect(() => {
    if (isAvailable) {
      setAllDay(false);
    }
  }, [isAvailable]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!date) {
      setDateError('Please pick a date to continue.');
      return;
    }
    setDateError(null);
    
    // Time validation for today's date
    const isToday = date.toDateString() === new Date().toDateString();
    if (!allDay && isToday) {
        const now = new Date();
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        if (startHours < now.getHours() || (startHours === now.getHours() && startMinutes < now.getMinutes())) {
            setTimeError('Start time cannot be in the past for today.');
            return;
        }
    }
    setTimeError(null);
    
    onSave({
      id: initialData?.id,
      date: format(date, 'yyyy-MM-dd'),
      isAvailable,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      reason: reason || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="space-y-2">
        <Label className="font-semibold text-gray-800">Exception Type</Label>
        <ExceptionTypeToggle value={isAvailable} onChange={setIsAvailable} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
            <Label htmlFor="date" className="font-semibold text-gray-800">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 border-gray-300 hover:border-gray-400",
                    !date && "text-muted-foreground",
                    dateError && "border-red-500 focus:ring-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    setDate(selectedDate as Date);
                    if (selectedDate) {
                      setDateError(null);
                      setTimeError(null);
                    }
                  }}
                  disabled={{ before: new Date() }}
                  initialFocus
                  classNames={{
                    root: "p-3",
                    caption_label: "text-lg font-medium",
                    head_cell: "w-10 font-semibold",
                    day: "h-10 w-10 text-base",
                    nav_button: "h-10 w-10",
                  }}
                  modifiers={{
                    hasException: existingExceptionDates,
                  }}
                  modifiersClassNames={{
                    hasException: 'has-exception',
                  }}
                />
              </PopoverContent>
            </Popover>
            {dateError && <p className="text-sm text-red-600 mt-1">{dateError}</p>}
        </div>
        
        <div className="space-y-2">
            <Label className="font-semibold text-gray-800 invisible md:visible">All Day Toggle</Label>
            {/* "All Day" toggle is only shown for "Time Off" */}
            {!isAvailable && (
                <Label
                    htmlFor="all-day"
                    className={cn(
                        "flex items-center justify-between space-x-3 rounded-lg border h-11 px-4 cursor-pointer transition-all",
                        allDay 
                            ? "bg-green-50 border-green-400" 
                            : "bg-white border-gray-300 hover:border-gray-400"
                    )}
                >
                    <span className="font-medium text-gray-800">All Day</span>
                    <Switch 
                        id="all-day" 
                        checked={allDay} 
                        onCheckedChange={setAllDay}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300" 
                    />
                </Label>
            )}
        </div>
      </div>
      
      <div className={cn("transition-all duration-300 ease-in-out overflow-hidden", allDay && !isAvailable ? "max-h-0 opacity-0" : "max-h-96 opacity-100")}>
        <div className="pt-4">
            <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg",
                isAvailable ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300",
                timeError && "border-red-500"
            )}>
              <div className="space-y-2">
                <Label htmlFor="start-time" className="font-semibold text-gray-800">Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={e => {
                      setStartTime(e.target.value)
                      setTimeError(null);
                  }}
                  disabled={allDay}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="font-semibold text-gray-800">End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  disabled={allDay}
                  className="bg-white"
                />
              </div>
            </div>
            {timeError && <p className="text-sm text-red-600 mt-2">{timeError}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason" className="font-semibold text-gray-800">Reason (Optional)</Label>
        <Textarea
          id="reason"
          placeholder="e.g., Doctor's Appointment, Vacation"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="border-gray-300"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-6">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button 
          type="submit" 
          disabled={isLoading} 
        >
          {isLoading ? 'Saving...' : 'Save Exception'}
        </Button>
      </div>
    </form>
  );
} 