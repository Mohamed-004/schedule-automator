import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log the environment variables (without the full key for security)
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey)
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test the connection and table
async function testConnection() {
  try {
    // First, test basic connection
    const { data: authData, error: authError } = await supabase.auth.getSession()
    console.log('Auth test:', authError ? 'Failed' : 'Success')

    // Then test table access
    const { data: tableData, error: tableError } = await supabase
      .from('tasks')
      .select('count')
      .single()

    if (tableError) {
      console.error('Table access error:', tableError)
      console.error('Error details:', {
        code: tableError.code,
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint
      })
    } else {
      console.log('Table access successful:', tableData)
    }
  } catch (error) {
    console.error('Connection test error:', error)
  }
}

testConnection() 