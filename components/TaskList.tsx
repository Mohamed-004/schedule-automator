'use client'

import { useEffect, useState } from 'react'
import { db, Task } from '@/lib/db'

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ title: '', description: '' })

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setError(null)
      const fetchedTasks = await db.getTasks()
      setTasks(fetchedTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setError('Failed to load tasks. Please check your database connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    try {
      setError(null)
      const task = await db.createTask({
        title: newTask.title,
        description: newTask.description,
        status: 'pending'
      })
      setTasks([task, ...tasks])
      setNewTask({ title: '', description: '' })
    } catch (error) {
      console.error('Error creating task:', error)
      setError('Failed to create task. Please try again.')
    }
  }

  async function handleUpdateStatus(taskId: string, newStatus: Task['status']) {
    try {
      setError(null)
      const updatedTask = await db.updateTask(taskId, { status: newStatus })
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task))
    } catch (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task status. Please try again.')
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      setError(null)
      await db.deleteTask(taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <form onSubmit={handleCreateTask}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <input
              type="text"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Task description"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add Task
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Task List</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-600 mt-1">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={task.status}
                    onChange={(e) => handleUpdateStatus(task.id, e.target.value as Task['status'])}
                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-gray-500 text-center py-4">No tasks found. Add a new task to get started!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 