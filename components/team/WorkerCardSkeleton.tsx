export default function WorkerCardSkeleton() {
  return (
    <div className="p-6 bg-white rounded-lg shadow animate-pulse flex flex-col h-full">
      <div className="w-12 h-12 rounded-full bg-gray-200 mb-4" />
      <div className="h-5 w-1/2 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded mb-1" />
      <div className="h-4 w-1/3 bg-gray-200 rounded mb-4" />
      <div className="mt-auto flex flex-col gap-2">
        <div className="h-8 w-full bg-gray-200 rounded mb-2" />
        <div className="h-8 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
} 