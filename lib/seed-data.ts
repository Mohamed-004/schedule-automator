import { createClient } from '@/lib/supabase/client'

/**
 * Utility functions to seed database with test data
 * This ensures we have real data to test the timeline with
 */
export async function seedDatabaseWithTestData() {
  const supabase = createClient()

  try {
    // First, let's get the current user's business
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Get or create business - try both user_id and owner_id
    let { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If not found with user_id, try owner_id
    if (businessError && businessError.code === 'PGRST116') {
      const { data: businessByOwner, error: ownerError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      
      if (!ownerError && businessByOwner) {
        business = businessByOwner
        businessError = null
      }
    }

    if (businessError && businessError.code === 'PGRST116') {
      // Create business if it doesn't exist
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          name: 'Demo Cleaning Company',
          user_id: user.id, // Try user_id first
          email: user.email,
          phone: '+1-555-0123',
          address: '123 Main St, City, State'
        })
        .select()
        .single()

      if (createError) {
        // If user_id fails, try owner_id
        const { data: newBusinessOwner, error: ownerCreateError } = await supabase
          .from('businesses')
          .insert({
            name: 'Demo Cleaning Company',
            owner_id: user.id,
            email: user.email,
            phone: '+1-555-0123',
            address: '123 Main St, City, State'
          })
          .select()
          .single()

        if (ownerCreateError) throw ownerCreateError
        business = newBusinessOwner
      } else {
        business = newBusiness
      }
    }

    if (!business) {
      throw new Error('Could not create or retrieve business')
    }

    // Create test workers
    const workers = [
      {
        name: 'Ameer Gailan',
        email: 'ameer@demo.com',
        phone: '+1-555-0001',
        business_id: business.id,
        status: 'active',
        hourly_rate: 25.00,
        skills: ['office_cleaning', 'window_cleaning']
      },
      {
        name: 'Test Worker',
        email: 'test@demo.com',
        phone: '+1-555-0002',
        business_id: business.id,
        status: 'active',
        hourly_rate: 22.00,
        skills: ['maintenance', 'general_cleaning']
      },
      {
        name: 'Part Time Worker',
        email: 'partime@demo.com',
        phone: '+1-555-0003',
        business_id: business.id,
        status: 'active',
        hourly_rate: 20.00,
        skills: ['basic_cleaning']
      }
    ]

    // Insert workers
    const { data: createdWorkers, error: workersError } = await supabase
      .from('workers')
      .upsert(workers, {
        onConflict: 'email',
        ignoreDuplicates: true
      })
      .select()

    if (workersError) throw workersError

    // Create test clients
    const clients = [
      {
        name: 'Tech Corp',
        email: 'contact@techcorp.com',
        phone: '+1-555-1001',
        business_id: business.id,
        address: '456 Tech Blvd, City, State'
      },
      {
        name: 'Retail Store',
        email: 'manager@retailstore.com',
        phone: '+1-555-1002',
        business_id: business.id,
        address: '789 Retail Ave, City, State'
      },
      {
        name: 'Property Co',
        email: 'info@propertyco.com',
        phone: '+1-555-1003',
        business_id: business.id,
        address: '321 Property St, City, State'
      }
    ]

    const { data: createdClients, error: clientsError } = await supabase
      .from('clients')
      .upsert(clients, {
        onConflict: 'email',
        ignoreDuplicates: true
      })
      .select()

    if (clientsError) throw clientsError

    // Create jobs for today
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    const jobs = [
      {
        title: 'Office Cleaning',
        description: 'Complete office cleaning including desks, floors, and restrooms',
        client_id: createdClients?.[0]?.id,
        worker_id: createdWorkers?.[0]?.id,
        business_id: business.id,
        scheduled_at: `${todayString}T09:00:00.000Z`,
        duration_minutes: 120, // 2 hours
        status: 'scheduled'
      },
      {
        title: 'Window Cleaning',
        description: 'Clean all windows inside and outside',
        client_id: createdClients?.[1]?.id,
        worker_id: createdWorkers?.[0]?.id,
        business_id: business.id,
        scheduled_at: `${todayString}T14:00:00.000Z`,
        duration_minutes: 90, // 1.5 hours
        status: 'in_progress'
      },
      {
        title: 'Maintenance Check',
        description: 'Routine maintenance and cleaning check',
        client_id: createdClients?.[2]?.id,
        worker_id: createdWorkers?.[1]?.id,
        business_id: business.id,
        scheduled_at: `${todayString}T10:30:00.000Z`,
        duration_minutes: 60, // 1 hour
        status: 'completed'
      },
      {
        title: 'Deep Clean',
        description: 'Deep cleaning service for entire facility',
        client_id: createdClients?.[0]?.id,
        worker_id: createdWorkers?.[1]?.id,
        business_id: business.id,
        scheduled_at: `${todayString}T15:00:00.000Z`,
        duration_minutes: 180, // 3 hours
        status: 'scheduled'
      }
    ]

    const { data: createdJobs, error: jobsError } = await supabase
      .from('jobs')
      .upsert(jobs, {
        onConflict: 'id',
        ignoreDuplicates: true
      })
      .select()

    if (jobsError) throw jobsError

    console.log('✅ Database seeded successfully!')
    console.log(`Created ${createdWorkers?.length || 0} workers`)
    console.log(`Created ${createdClients?.length || 0} clients`)
    console.log(`Created ${createdJobs?.length || 0} jobs`)

    return {
      success: true,
      data: {
        business,
        workers: createdWorkers,
        clients: createdClients,
        jobs: createdJobs
      }
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clear all test data (useful for cleanup)
 */
export async function clearTestData() {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Delete in order due to foreign key constraints
    await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('workers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('✅ Test data cleared successfully!')
    return { success: true }

  } catch (error) {
    console.error('❌ Error clearing test data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 