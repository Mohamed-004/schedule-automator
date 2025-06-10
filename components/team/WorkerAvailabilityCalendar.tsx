'use client'

import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, SlotInfo, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvailabilitySlot, AvailabilityException } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

const localizer = momentLocalizer(moment);

interface WorkerAvailabilityCalendarProps {
  workerId: string;
  readOnly?: boolean;
  onSlotSelect?: (slotInfo: SlotInfo) => void;
}

interface AvailabilityEvent extends Event {
  type: 'weekly' | 'exception';
  isAvailable: boolean;
}

export default function WorkerAvailabilityCalendar({ 
  workerId, 
  readOnly = true,
  onSlotSelect,
}: WorkerAvailabilityCalendarProps) {
  const [events, setEvents] = useState<AvailabilityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (workerId) {
      loadAvailability();
    }
  }, [workerId]);

  const loadAvailability = async () => {
    setIsLoading(true);
    
    try {
      // Fetch weekly availability
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('worker_weekly_availability')
        .select('*')
        .eq('worker_id', workerId);
      
      if (weeklyError) throw weeklyError;
      
      // Fetch exceptions
      const { data: exceptionData, error: exceptionError } = await supabase
        .from('worker_availability_exceptions')
        .select('*')
        .eq('worker_id', workerId);
      
      if (exceptionError) throw exceptionError;
      
      // Generate events for the next 4 weeks
      const calendarEvents: AvailabilityEvent[] = [];
      
      // Process weekly recurring availability
      if (weeklyData && weeklyData.length > 0) {
        const startDate = moment().startOf('week');
        const endDate = moment().add(4, 'weeks').endOf('week');
        
        for (let m = moment(startDate); m.isBefore(endDate); m.add(1, 'day')) {
          const dayOfWeek = m.day(); // 0-6 (Sunday-Saturday)
          
          // Find slots for this day of week
          const daySlots = weeklyData.filter((slot: AvailabilitySlot) => slot.day === dayOfWeek);
          
          daySlots.forEach((slot: AvailabilitySlot) => {
            const slotDate = m.format('YYYY-MM-DD');
            const start = moment(`${slotDate} ${slot.start}`);
            const end = moment(`${slotDate} ${slot.end}`);
            
            calendarEvents.push({
              title: 'Available',
              start: start.toDate(),
              end: end.toDate(),
              allDay: false,
              type: 'weekly',
              isAvailable: true,
              resource: { id: slot.id },
            });
          });
        }
      }
      
      // Process exceptions
      if (exceptionData && exceptionData.length > 0) {
        exceptionData.forEach((exception: AvailabilityException) => {
          const date = exception.date;
          
          if (exception.is_available) {
            // Custom availability hours
            if (exception.start_time && exception.end_time) {
              const start = moment(`${date} ${exception.start_time}`);
              const end = moment(`${date} ${exception.end_time}`);
              
              calendarEvents.push({
                title: 'Custom Hours',
                start: start.toDate(),
                end: end.toDate(),
                allDay: false,
                type: 'exception',
                isAvailable: true,
                resource: { id: exception.id, reason: exception.reason },
              });
            }
          } else {
            // Unavailable (time off)
            if (exception.start_time && exception.end_time) {
              // Specific hours
              const start = moment(`${date} ${exception.start_time}`);
              const end = moment(`${date} ${exception.end_time}`);
              
              calendarEvents.push({
                title: exception.reason || 'Unavailable',
                start: start.toDate(),
                end: end.toDate(),
                allDay: false,
                type: 'exception',
                isAvailable: false,
                resource: { id: exception.id, reason: exception.reason },
              });
            } else {
              // All day
              calendarEvents.push({
                title: exception.reason || 'Unavailable',
                start: moment(date).toDate(),
                end: moment(date).add(1, 'day').toDate(),
                allDay: true,
                type: 'exception',
                isAvailable: false,
                resource: { id: exception.id, reason: exception.reason },
              });
            }
          }
        });
      }
      
      setEvents(calendarEvents);
      
      if (calendarEvents.length === 0) {
        toast({
          title: 'No Availability Set',
          description: 'This worker has no availability configured yet. Set up weekly schedule or add exceptions.',
          variant: 'info',
        });
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: 'Failed to Load Calendar',
        description: 'Unable to load worker availability. Please try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (readOnly) return;
    if (onSlotSelect) onSlotSelect(slotInfo);
  };

  const eventStyleGetter = (event: AvailabilityEvent) => {
    if (!event.isAvailable) {
      return {
        style: {
          backgroundColor: '#f87171', // red-400
          color: 'white',
          borderRadius: '4px',
          border: 'none',
        },
      };
    }
    
    if (event.type === 'exception') {
      return {
        style: {
          backgroundColor: '#60a5fa', // blue-400
          color: 'white',
          borderRadius: '4px',
          border: 'none',
        },
      };
    }
    
    return {
      style: {
        backgroundColor: '#4ade80', // green-400
        color: 'white',
        borderRadius: '4px',
        border: 'none',
      },
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Worker Availability</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <p>Loading availability...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-4 mx-auto" style={{ maxWidth: 1100 }}>
            <Calendar
              localizer={localizer}
              events={events}
              defaultView="week"
              views={['week']}
              step={30}
              timeslots={2}
              selectable={!readOnly}
              onSelectSlot={handleSelectSlot}
              style={{ height: 550, background: 'white', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)' }}
              eventPropGetter={eventStyleGetter}
              defaultDate={new Date()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 