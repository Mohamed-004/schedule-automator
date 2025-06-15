'use client'

import { AssignmentForm } from './components/assignment-form';
import { useAssignJobsData } from './useAssignJobsData';

export default function AssignJobsPage() {
  const { clients, workers, jobTypes, isLoading, error } = useAssignJobsData();

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
        </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50/50">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border">
            <h1 className="text-xl font-semibold text-red-800">An Error Occurred</h1>
            <p className="mt-2 text-sm text-red-600">
                {error}
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Create and Assign a New Job
                </h1>
                <p className="mt-2 text-base text-gray-600 max-w-3xl">
                    Follow the steps to fill in job details, set a schedule, and assign the best available worker.
                </p>
            </div>
            <AssignmentForm
                clients={clients}
                workers={workers}
                jobTypes={jobTypes}
            />
        </div>
    </div>
  );
} 