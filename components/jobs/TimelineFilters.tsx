'use client'

import React from 'react'
import { Search, Filter, Users, Calendar, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Worker } from './TimelineScheduler'

interface Filters {
  search: string
  status: string
  priority: string
  worker: string
}

interface TimelineFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  workers: Worker[]
}

export function TimelineFilters({ filters, onFiltersChange, workers }: TimelineFiltersProps) {
  const updateFilter = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const activeFiltersCount = Object.values(filters).filter(value => value !== '' && value !== 'all').length

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      priority: 'all',
      worker: 'all'
    })
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search jobs or clients..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Scheduled
              </div>
            </SelectItem>
            <SelectItem value="in_progress">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                In Progress
              </div>
            </SelectItem>
            <SelectItem value="completed">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Completed
              </div>
            </SelectItem>
            <SelectItem value="cancelled">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Cancelled
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Priority Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                Urgent
              </div>
            </SelectItem>
            <SelectItem value="high">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                High
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                Medium
              </div>
            </SelectItem>
            <SelectItem value="low">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                Low
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Worker Filter */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <Select value={filters.worker} onValueChange={(value) => updateFilter('worker', value)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Worker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workers</SelectItem>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    worker.status === 'available' && 'bg-green-500',
                    worker.status === 'busy' && 'bg-amber-500',
                    worker.status === 'offline' && 'bg-red-500'
                  )} />
                  {worker.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters & Clear */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
          </Badge>
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-gray-500">Quick:</span>
        <button
          onClick={() => updateFilter('priority', 'urgent')}
          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Urgent Only
        </button>
        <button
          onClick={() => updateFilter('status', 'scheduled')}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Scheduled
        </button>
      </div>
    </div>
  )
} 