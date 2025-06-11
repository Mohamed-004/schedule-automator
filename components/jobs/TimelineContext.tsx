'use client'

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Job, Worker } from './TimelineScheduler'

export type ZoomLevel = '15min' | '30min' | '1hr'
export type ViewMode = 'day' | 'week'

interface TimelineState {
  currentView: ViewMode
  selectedDate: Date
  visibleWorkers: Worker[]
  zoomLevel: ZoomLevel
  jobs: Job[]
  liveClockTime: Date
  buffers: Record<string, number> // workerId -> buffer time in minutes
  filters: {
    search: string
    status: string
    priority: string
    worker: string
  }
  isLoading: boolean
  draggedJob: Job | null
}

type TimelineAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_ZOOM_LEVEL'; payload: ZoomLevel }
  | { type: 'SET_JOBS'; payload: Job[] }
  | { type: 'SET_WORKERS'; payload: Worker[] }
  | { type: 'UPDATE_LIVE_TIME'; payload: Date }
  | { type: 'SET_FILTERS'; payload: Partial<TimelineState['filters']> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DRAGGED_JOB'; payload: Job | null }
  | { type: 'UPDATE_JOB'; payload: { jobId: string; updates: Partial<Job> } }
  | { type: 'SET_WORKER_BUFFER'; payload: { workerId: string; buffer: number } }

const initialState: TimelineState = {
  currentView: 'week',
  selectedDate: new Date(),
  visibleWorkers: [],
  zoomLevel: '30min',
  jobs: [],
  liveClockTime: new Date(),
  buffers: {},
  filters: {
    search: '',
    status: 'all',
    priority: 'all',
    worker: 'all'
  },
  isLoading: false,
  draggedJob: null
}

function timelineReducer(state: TimelineState, action: TimelineAction): TimelineState {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, currentView: action.payload }
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload }
    
    case 'SET_ZOOM_LEVEL':
      return { ...state, zoomLevel: action.payload }
    
    case 'SET_JOBS':
      return { ...state, jobs: action.payload }
    
    case 'SET_WORKERS':
      return { ...state, visibleWorkers: action.payload }
    
    case 'UPDATE_LIVE_TIME':
      return { ...state, liveClockTime: action.payload }
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload }
      }
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_DRAGGED_JOB':
      return { ...state, draggedJob: action.payload }
    
    case 'UPDATE_JOB':
      return {
        ...state,
        jobs: state.jobs.map(job =>
          job.id === action.payload.jobId
            ? { ...job, ...action.payload.updates }
            : job
        )
      }
    
    case 'SET_WORKER_BUFFER':
      return {
        ...state,
        buffers: {
          ...state.buffers,
          [action.payload.workerId]: action.payload.buffer
        }
      }
    
    default:
      return state
  }
}

interface TimelineContextType {
  state: TimelineState
  dispatch: React.Dispatch<TimelineAction>
  
  // Helper functions
  setViewMode: (mode: ViewMode) => void
  setSelectedDate: (date: Date) => void
  setZoomLevel: (level: ZoomLevel) => void
  setJobs: (jobs: Job[]) => void
  setWorkers: (workers: Worker[]) => void
  updateFilters: (filters: Partial<TimelineState['filters']>) => void
  updateJob: (jobId: string, updates: Partial<Job>) => void
  setWorkerBuffer: (workerId: string, buffer: number) => void
  
  // Computed values
  filteredJobs: Job[]
  filteredWorkers: Worker[]
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined)

interface TimelineProviderProps {
  children: React.ReactNode
  initialJobs?: Job[]
  initialWorkers?: Worker[]
}

export function TimelineProvider({ 
  children, 
  initialJobs = [], 
  initialWorkers = [] 
}: TimelineProviderProps) {
  const [state, dispatch] = useReducer(timelineReducer, {
    ...initialState,
    jobs: initialJobs,
    visibleWorkers: initialWorkers
  })

  // Live clock update
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'UPDATE_LIVE_TIME', payload: new Date() })
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Helper functions
  const setViewMode = (mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode })
  }

  const setSelectedDate = (date: Date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date })
  }

  const setZoomLevel = (level: ZoomLevel) => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: level })
  }

  const setJobs = (jobs: Job[]) => {
    dispatch({ type: 'SET_JOBS', payload: jobs })
  }

  const setWorkers = (workers: Worker[]) => {
    dispatch({ type: 'SET_WORKERS', payload: workers })
  }

  const updateFilters = (filters: Partial<TimelineState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    dispatch({ type: 'UPDATE_JOB', payload: { jobId, updates } })
  }

  const setWorkerBuffer = (workerId: string, buffer: number) => {
    dispatch({ type: 'SET_WORKER_BUFFER', payload: { workerId, buffer } })
  }

  // Computed values
  const filteredJobs = state.jobs.filter(job => {
    const { search, status, priority, worker } = state.filters
    
    if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
        !job.client_name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    
    if (status !== 'all' && job.status !== status) {
      return false
    }
    
    if (priority !== 'all' && job.priority !== priority) {
      return false
    }
    
    if (worker !== 'all' && job.worker_id !== worker) {
      return false
    }
    
    return true
  })

  const filteredWorkers = state.visibleWorkers.filter(worker => {
    const { worker: workerFilter } = state.filters
    return workerFilter === 'all' || worker.id === workerFilter
  })

  const contextValue: TimelineContextType = {
    state,
    dispatch,
    setViewMode,
    setSelectedDate,
    setZoomLevel,
    setJobs,
    setWorkers,
    updateFilters,
    updateJob,
    setWorkerBuffer,
    filteredJobs,
    filteredWorkers
  }

  return (
    <TimelineContext.Provider value={contextValue}>
      {children}
    </TimelineContext.Provider>
  )
}

export function useTimeline() {
  const context = useContext(TimelineContext)
  if (context === undefined) {
    throw new Error('useTimeline must be used within a TimelineProvider')
  }
  return context
}

// Custom hooks for specific functionality
export function useTimelineFilters() {
  const { state, updateFilters } = useTimeline()
  return {
    filters: state.filters,
    updateFilters
  }
}

export function useTimelineJobs() {
  const { filteredJobs, updateJob } = useTimeline()
  return {
    jobs: filteredJobs,
    updateJob
  }
}

export function useTimelineWorkers() {
  const { filteredWorkers, setWorkerBuffer, state } = useTimeline()
  return {
    workers: filteredWorkers,
    setWorkerBuffer,
    buffers: state.buffers
  }
} 