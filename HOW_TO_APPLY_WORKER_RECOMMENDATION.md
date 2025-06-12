# How to Apply Worker Recommendation Changes

I've modified the `get_recommended_workers` function to improve workload distribution and better highlight client history. Here's how to apply these changes:

## Changes Made

1. **Increased the weight of workload balancing**:
   - Changed from 20 points to 35 points
   - Added a special bonus for workers with zero hours
   - Workers with fewer scheduled hours will be prioritized

2. **Modified the sorting algorithm**:
   - Now prioritizes workers with fewer hours (ascending sort by hours worked)
   - Then sorts by overall recommendation score
   - Finally by rating

3. **Adjusted other weights**:
   - Reduced skill match from 40 to 30 points
   - Reduced client preference from 30 to 25 points

## How to Apply

### Option 1: Via Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy and paste the entire contents of the `worker_recommendation.sql` file
5. Run the query

### Option 2: Using supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push worker_recommendation.sql
```

### Option 3: Using psql (if available)

```bash
psql -d your_database_name -f worker_recommendation.sql
```

## Verifying the Changes

After applying the changes, you should see:
- Better distribution of work among all workers
- Workers with fewer hours should appear higher in recommendations
- Client history tags should be correctly displayed

The "Previous Client History" tag will only appear for workers who have previously worked with a client. If there's no historical data of workers having served specific clients, this tag won't appear. 