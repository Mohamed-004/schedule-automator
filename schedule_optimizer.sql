-- Function to find optimal time slots for scheduling a job
CREATE OR REPLACE FUNCTION find_optimal_slots(
    p_business_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER,
    p_client_id UUID,
    p_job_type_id UUID DEFAULT NULL,
    p_preferred_worker_id UUID DEFAULT NULL,
    p_min_start_time TIME DEFAULT '08:00:00',  -- Default work day start
    p_max_end_time TIME DEFAULT '18:00:00'     -- Default work day end
)
RETURNS TABLE (
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    worker_id UUID,
    worker_name TEXT,
    slot_score DECIMAL(5,2),
    optimization_reason TEXT,
    is_back_to_back BOOLEAN,
    worker_total_hours DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_timezone TEXT;
    v_slot_increment INTEGER := 30; -- Minutes between candidate slots
    v_current_time TIME;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
BEGIN
    -- Get business timezone
    SELECT timezone INTO v_business_timezone
    FROM businesses
    WHERE id = p_business_id;

    -- If no timezone found, default to UTC
    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC';
    END IF;

    -- Create a series of potential time slots for the given date
    v_current_time := p_min_start_time;
    
    -- Generate all possible time slots for the given date
    WHILE v_current_time <= (p_max_end_time - make_interval(mins => p_duration_minutes)) LOOP
        -- For each time slot, find available workers
        v_slot_start := (p_date || ' ' || v_current_time)::TIMESTAMPTZ AT TIME ZONE v_business_timezone;
        v_slot_end := (v_slot_start + make_interval(mins => p_duration_minutes));
        
        -- For each slot and available worker, return optimized scores
        RETURN QUERY
        WITH available_workers AS (
            -- Get workers that are available for this slot
            SELECT 
                w.id,
                w.name
            FROM 
                workers w
            WHERE 
                w.business_id = p_business_id
                AND w.status = 'active'
                AND (p_preferred_worker_id IS NULL OR w.id = p_preferred_worker_id)
                AND is_worker_available(w.id, v_slot_start, v_slot_end, v_business_timezone)
        ),
        
        worker_jobs AS (
            -- Get all jobs for these workers on this day
            SELECT 
                j.worker_id,
                j.scheduled_at,
                j.scheduled_at + make_interval(mins => j.duration_minutes) as job_end_time,
                j.duration_minutes
            FROM 
                jobs j
            WHERE 
                j.worker_id IN (SELECT id FROM available_workers)
                AND DATE(j.scheduled_at AT TIME ZONE v_business_timezone) = p_date
                AND j.status != 'cancelled'
        ),
        
        worker_hours AS (
            -- Calculate total hours per worker for this day
            SELECT 
                j.worker_id,
                SUM(j.duration_minutes)/60.0 as total_hours
            FROM 
                worker_jobs j
            GROUP BY 
                j.worker_id
        ),
        
        adjacent_slots AS (
            -- Find if this slot is adjacent to an existing job
            SELECT DISTINCT
                j.worker_id,
                CASE
                    -- This slot starts right after an existing job
                    WHEN ABS(EXTRACT(EPOCH FROM (v_slot_start - j.job_end_time)) / 60) < 15 THEN 'after'
                    -- This slot ends right before an existing job
                    WHEN ABS(EXTRACT(EPOCH FROM (j.scheduled_at - v_slot_end)) / 60) < 15 THEN 'before'
                    ELSE NULL
                END as adjacency_type
            FROM 
                worker_jobs j
            WHERE 
                -- Only consider jobs that are within 15 minutes of the slot
                ABS(EXTRACT(EPOCH FROM (v_slot_start - j.job_end_time)) / 60) < 15
                OR ABS(EXTRACT(EPOCH FROM (j.scheduled_at - v_slot_end)) / 60) < 15
        ),
        
        worker_recommendations AS (
            -- Get recommendation scores for workers
            SELECT 
                w.id as worker_id,
                COALESCE(r.recommendation_score, 50) as recommendation_score,
                COALESCE(r.client_preferred, FALSE) as client_preferred,
                COALESCE(r.skill_match, FALSE) as skill_match
            FROM 
                available_workers w
            LEFT JOIN LATERAL (
                SELECT * FROM get_recommended_workers(
                    p_business_id, 
                    v_slot_start, 
                    v_slot_end, 
                    p_client_id, 
                    p_job_type_id
                ) WHERE worker_id = w.id
            ) r ON TRUE
        )
        
        SELECT 
            v_slot_start as start_time,
            v_slot_end as end_time,
            w.id as worker_id,
            w.name as worker_name,
            
            -- Calculate an optimization score (0-100)
            (
                -- Base worker recommendation score (0-40 points)
                COALESCE(wr.recommendation_score * 0.4, 20) +
                
                -- Back-to-back efficiency score (0-30 points)
                CASE 
                    WHEN adj.adjacency_type IS NOT NULL THEN 30
                    ELSE 0 
                END +
                
                -- Workload balancing score (0-30 points)
                CASE
                    WHEN COALESCE(wh.total_hours, 0) = 0 THEN 30 -- Prioritize workers with no jobs
                    WHEN COALESCE(wh.total_hours, 0) < 4 THEN 25 -- Good balance
                    WHEN COALESCE(wh.total_hours, 0) < 6 THEN 15 -- Moderate workload
                    ELSE 5 -- Heavy workload already
                END
            ) as slot_score,
            
            -- Human-readable explanation for why this slot is optimal
            CASE
                WHEN adj.adjacency_type IS NOT NULL AND wr.client_preferred THEN 
                    'Back-to-back scheduling with client favorite worker'
                WHEN adj.adjacency_type IS NOT NULL THEN 
                    'Efficient back-to-back scheduling'
                WHEN wr.client_preferred AND wr.skill_match THEN
                    'Preferred worker with matching skills'
                WHEN wr.client_preferred THEN
                    'Client favorite worker'
                WHEN COALESCE(wh.total_hours, 0) = 0 THEN
                    'Worker has open schedule today'
                WHEN wr.skill_match THEN
                    'Worker has the right skills for this job'
                ELSE
                    'Available worker with balanced schedule'
            END as optimization_reason,
            
            -- Flag to show if slot is back-to-back with another job
            adj.adjacency_type IS NOT NULL as is_back_to_back,
            
            -- Worker's total hours for the day including this job
            COALESCE(wh.total_hours, 0) + (p_duration_minutes / 60.0) as worker_total_hours
            
        FROM 
            available_workers w
        LEFT JOIN 
            worker_hours wh ON wh.worker_id = w.id
        LEFT JOIN 
            adjacent_slots adj ON adj.worker_id = w.id
        LEFT JOIN 
            worker_recommendations wr ON wr.worker_id = w.id
        WHERE
            -- Exclude slots that would make a worker's day too long
            COALESCE(wh.total_hours, 0) + (p_duration_minutes / 60.0) <= 10 -- Max 10 hours per day
        ORDER BY 
            slot_score DESC
        LIMIT 3; -- Return top 3 options for each time slot
        
        -- Move to the next time slot
        v_current_time := v_current_time + make_interval(mins => v_slot_increment);
    END LOOP;
    
    -- If no results were returned, try with a larger search window
    IF NOT FOUND THEN
        RETURN;
    END IF;
END;
$$; 