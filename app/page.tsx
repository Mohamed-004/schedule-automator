export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Server Test</h1>
        <p className="text-gray-600 mb-4">
          If you can see this page, the Next.js server is working correctly.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>✅ Next.js:</span>
            <span className="text-green-600">Working</span>
          </div>
          <div className="flex justify-between">
            <span>✅ React:</span>
            <span className="text-green-600">Working</span>
          </div>
          <div className="flex justify-between">
            <span>✅ Tailwind:</span>
            <span className="text-green-600">Working</span>
          </div>
        </div>
        <div className="mt-6">
          <a 
            href="/dashboard/jobs" 
            className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Jobs Timeline
          </a>
        </div>
      </div>
    </div>
  )
}
