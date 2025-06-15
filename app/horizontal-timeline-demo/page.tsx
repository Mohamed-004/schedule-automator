import { HorizontalTimeline } from '@/components/timeline/HorizontalTimeline'
import { ResponsiveHorizontalTimeline } from '@/components/timeline/ResponsiveHorizontalTimeline'

export default function HorizontalTimelineDemoPage() {
  // Demo data
  const selectedDate = new Date()
  
  const demoWorkers = [
    {
      id: '1',
      name: 'Ameer Gailan',
      email: 'ameer@example.com',
      working_hours: [
        { start: '08:00', end: '17:00', day: 0 }
      ]
    },
    {
      id: '2', 
      name: 'Test Worker',
      email: 'test@example.com',
      working_hours: [
        { start: '09:00', end: '18:00', day: 0 }
      ]
    },
    {
      id: '3',
      name: 'Part Time Worker',
      email: 'parttime@example.com',
      working_hours: [
        { start: '10:00', end: '14:00', day: 0 }
      ]
    }
  ]

  const demoJobs = [
    {
      id: '1',
      title: 'Plumbing Repair',
      description: 'Fix kitchen sink leak and replace faucet',
      client_name: 'John Smith',
      location: '123 Main St',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0).toISOString(),
      duration: 120, // 2 hours
      status: 'in_progress' as const,
      priority: 'high' as const,
      worker_id: '1'
    },
    {
      id: '2',
      title: 'Kitchen Installation',
      description: 'Install new kitchen cabinets and countertops',
      client_name: 'Jane Doe',
      location: '456 Oak Ave',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 13, 30).toISOString(),
      duration: 240, // 4 hours
      status: 'pending' as const,
      priority: 'medium' as const,
      worker_id: '1'
    },
    {
      id: '3',
      title: 'Bathroom Renovation',
      description: 'Complete bathroom remodel including tiles and fixtures',
      client_name: 'Bob Wilson',
      location: '789 Pine St',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 10, 0).toISOString(),
      duration: 180, // 3 hours
      status: 'pending' as const,
      priority: 'urgent' as const,
      worker_id: '2'
    },
    {
      id: '4',
      title: 'Maintenance Check',
      description: 'Routine maintenance and inspection',
      client_name: 'Alice Brown',
      location: '321 Elm St',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 11, 0).toISOString(),
      duration: 60, // 1 hour
      status: 'completed' as const,
      priority: 'low' as const,
      worker_id: '3'
    },
    {
      id: '5',
      title: 'Emergency Repair',
      description: 'Urgent pipe burst repair',
      client_name: 'Mike Davis',
      location: '654 Maple Dr',
      scheduled_at: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 15, 0).toISOString(),
      duration: 90, // 1.5 hours
      status: 'pending' as const,
      priority: 'urgent' as const,
      worker_id: '2'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Modern Horizontal Timeline Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A clean, modern timeline design with horizontal scrollable job blocks. 
            Job widths reflect duration, sorted by start time, with responsive mobile layout.
          </p>
        </div>

        {/* Basic Horizontal Timeline */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Horizontal Timeline</h2>
          <HorizontalTimeline
            workers={demoWorkers}
            jobs={demoJobs}
            selectedDate={selectedDate}
          />
        </div>

        {/* Responsive Horizontal Timeline */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsive Horizontal Timeline</h2>
          <ResponsiveHorizontalTimeline
            workers={demoWorkers}
            jobs={demoJobs}
            selectedDate={selectedDate}
          />
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">🎯 Duration-Based Width</h4>
              <p className="text-gray-600">Job blocks automatically size based on duration (2px per minute, 120px minimum)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">📱 Responsive Design</h4>
              <p className="text-gray-600">Desktop: side-by-side layout. Mobile: stacked cards with collapsible timelines</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">🔄 Horizontal Scroll</h4>
              <p className="text-gray-600">Natural horizontal scrolling for timeline navigation</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">🎨 Status Colors</h4>
              <p className="text-gray-600">Color-coded job blocks: yellow (pending), blue (in progress), green (completed)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">📋 Priority Indicators</h4>
              <p className="text-gray-600">Left border colors indicate priority: gray (low), blue (medium), orange (high), red (urgent)</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">💬 Modal Details</h4>
              <p className="text-gray-600">Click any job block to view full details in a clean modal</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Desktop:</strong> Worker info is sticky on the left, timeline scrolls horizontally on the right</p>
            <p>• <strong>Mobile:</strong> Tap worker cards to expand/collapse their timelines</p>
            <p>• <strong>Job Blocks:</strong> Click any job block to view detailed information</p>
            <p>• <strong>Scrolling:</strong> Use horizontal scroll or swipe to navigate through jobs</p>
            <p>• <strong>No Grid Issues:</strong> Pure flexbox layout eliminates alignment problems</p>
          </div>
        </div>
      </div>
    </div>
  )
} 