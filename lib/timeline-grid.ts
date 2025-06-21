export interface TimeSlot {
  startTime: string
  endTime: string
  type: 'available' | 'scheduled' | 'break'
  duration: number
}

export interface WorkerTimelineData {
  id: string
  name: string
  status: string
  timeSlots: TimeSlot[]
}

export function generateTimeGrid(startHour: number = 8, endHour: number = 18, intervalMinutes: number = 30): string[] {
  const times: string[] = []
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      times.push(timeString)
    }
  }
  
  return times
}

export function calculateTimeSlotWidth(duration: number, totalMinutes: number): number {
  return (duration / totalMinutes) * 100
}

export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function getTimeSlotPosition(startTime: string, gridStartTime: string, totalDuration: number): number {
  const startMinutes = parseTimeToMinutes(startTime)
  const gridStartMinutes = parseTimeToMinutes(gridStartTime)
  const offsetMinutes = startMinutes - gridStartMinutes
  
  return (offsetMinutes / totalDuration) * 100
}

export const DEFAULT_BUSINESS_HOURS = {
  start: '08:00',
  end: '18:00',
  breakStart: '12:00',
  breakEnd: '13:00'
}

export const TIME_SLOT_COLORS = {
  available: 'bg-green-100 text-green-800 border-green-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  break: 'bg-gray-100 text-gray-600 border-gray-200',
  unavailable: 'bg-red-100 text-red-800 border-red-200'
} 