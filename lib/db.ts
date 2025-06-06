import { supabase } from './supabase'

// Types for your data
export type Task = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

// Database operations
export const db = {
  // Create a new task
  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('Creating task with data:', task)
      const { data, error } = await supabase
        .from('tasks')
        .insert([task])
        .select()
        .single()
      
      if (error) {
        console.error('Create task error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      console.log('Task created successfully:', data)
      return data
    } catch (error) {
      console.error('Unexpected error in createTask:', error)
      throw error
    }
  },

  // Get all tasks
  async getTasks() {
    try {
      console.log('Fetching all tasks')
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Get tasks error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      console.log('Tasks fetched successfully:', data?.length || 0, 'tasks')
      return data
    } catch (error) {
      console.error('Unexpected error in getTasks:', error)
      throw error
    }
  },

  // Get a single task by ID
  async getTask(id: string) {
    try {
      console.log('Fetching task with ID:', id)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Get task error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      console.log('Task fetched successfully:', data)
      return data
    } catch (error) {
      console.error('Unexpected error in getTask:', error)
      throw error
    }
  },

  // Update a task
  async updateTask(id: string, updates: Partial<Task>) {
    try {
      console.log('Updating task:', id, 'with updates:', updates)
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Update task error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      console.log('Task updated successfully:', data)
      return data
    } catch (error) {
      console.error('Unexpected error in updateTask:', error)
      throw error
    }
  },

  // Delete a task
  async deleteTask(id: string) {
    try {
      console.log('Deleting task:', id)
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Delete task error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        throw error
      }
      console.log('Task deleted successfully')
    } catch (error) {
      console.error('Unexpected error in deleteTask:', error)
      throw error
    }
  }
} 