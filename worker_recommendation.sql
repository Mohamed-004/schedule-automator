-- Function to get recommended workers for a job
CREATE OR REPLACE FUNCTION get_recommended_workers(
    p_business_id UUID,
    p_job_start_time TIMESTAMPTZ,
    p_job_end_time TIMESTAMPTZ,
    p_client_id UUID,
    p_job_type_id UUID DEFAULT NULL
)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    worker_email TEXT,
    worker_phone TEXT,
    worker_role TEXT,
    recommendation_score DECIMAL(5,2),
    skill_match BOOLEAN,
    client_preferred BOOLEAN,
    balanced_workload BOOLEAN,
    has_ratings BOOLEAN,
    avg_rating DECIMAL(3,2),
    availability_score DECIMAL(5,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_timezone TEXT;
BEGIN
    -- Get business timezone
    SELECT timezone INTO v_business_timezone
    FROM businesses
    WHERE id = p_business_id;

    -- If no timezone found, default to UTC
    IF v_business_timezone IS NULL THEN
        v_business_timezone := 'UTC';
    END IF;

    RETURN QUERY
    WITH available_workers AS (
        -- Get all workers that are available for the job time
        SELECT 
            w.id,
            w.name,
            w.email,
            w.phone,
            w.role
        FROM 
            workers w
        WHERE 
            w.business_id = p_business_id
            AND w.status = 'active'
            AND is_worker_available(w.id, p_job_start_time, p_job_end_time, v_business_timezone)
    ),
    
    worker_job_counts AS (
        -- Count jobs per worker in the current week for workload balancing
        SELECT 
            j.worker_id,
            COUNT(*) as job_count
        FROM 
            jobs j
        WHERE 
            j.worker_id IN (SELECT id FROM available_workers)
            AND j.scheduled_at >= date_trunc('week', p_job_start_time)
            AND j.scheduled_at < date_trunc('week', p_job_start_time) + INTERVAL '1 week'
        GROUP BY 
            j.worker_id
    ),
    
    worker_hour_counts AS (
        -- Calculate total hours per worker in the current week
        SELECT 
            j.worker_id,
            SUM(j.duration_minutes)/60.0 as total_hours
        FROM 
            jobs j
        WHERE 
            j.worker_id IN (SELECT id FROM available_workers)
            AND j.scheduled_at >= date_trunc('week', p_job_start_time)
            AND j.scheduled_at < date_trunc('week', p_job_start_time) + INTERVAL '1 week'
        GROUP BY 
            j.worker_id
    ),

    worker_ratings AS (
        -- Get average ratings for each worker
        SELECT 
            wr.worker_id,
            AVG(wr.rating) as avg_rating,
            COUNT(*) as rating_count
        FROM 
            worker_ratings wr
        WHERE 
            wr.worker_id IN (SELECT id FROM available_workers)
        GROUP BY 
            wr.worker_id
    ),
    
    client_preferences AS (
        -- Find workers that have worked with this client before
        SELECT DISTINCT
            j.worker_id,
            COUNT(*) as job_count,
            MAX(j.scheduled_at) as last_job_date
        FROM 
            jobs j
        WHERE 
            j.worker_id IN (SELECT id FROM available_workers)
            AND j.client_id = p_client_id
        GROUP BY 
            j.worker_id
    ),
    
    skill_matches AS (
        -- Find workers with skills matching the job type
        SELECT 
            ws.worker_id,
            COALESCE(AVG(ws.level), 0) as avg_skill_level
        FROM 
            worker_skills ws
        JOIN 
            job_types jt ON jt.id = p_job_type_id
            AND ws.skill = ANY(jt.required_skills)
        WHERE 
            ws.worker_id IN (SELECT id FROM available_workers)
            AND p_job_type_id IS NOT NULL
        GROUP BY 
            ws.worker_id
    )
    
    SELECT 
        aw.id as worker_id,
        aw.name as worker_name,
        aw.email as worker_email,
        aw.phone as worker_phone,
        aw.role as worker_role,
        
        -- Calculate a composite recommendation score (0-100)
        (
            -- Skill match score (0-40 points)
            COALESCE(sm.avg_skill_level * 8, 0) +
            
            -- Client preference score (0-30 points)
            CASE 
                WHEN cp.worker_id IS NOT NULL THEN 30
                ELSE 0 
            END +
            
            -- Workload balance score (0-20 points)
            (20 - COALESCE(LEAST(whc.total_hours / 5, 20), 0)) +
            
            -- Rating score (0-10 points)
            COALESCE(wr.avg_rating * 2, 0)
        ) as recommendation_score,
        
        -- Useful flags for UI display
        sm.worker_id IS NOT NULL as skill_match,
        cp.worker_id IS NOT NULL as client_preferred,
        COALESCE(whc.total_hours, 0) < 20 as balanced_workload,
        wr.worker_id IS NOT NULL as has_ratings,
        COALESCE(wr.avg_rating, 0) as avg_rating,
        
        -- Availability score based on scheduled hours
        CASE 
            WHEN COALESCE(whc.total_hours, 0) = 0 THEN 100
            ELSE (40 - COALESCE(whc.total_hours, 0)) * 2.5
        END as availability_score
        
    FROM 
        available_workers aw
    LEFT JOIN 
        worker_job_counts wjc ON wjc.worker_id = aw.id
    LEFT JOIN 
        worker_hour_counts whc ON whc.worker_id = aw.id
    LEFT JOIN 
        worker_ratings wr ON wr.worker_id = aw.id
    LEFT JOIN 
        client_preferences cp ON cp.worker_id = aw.id
    LEFT JOIN 
        skill_matches sm ON sm.worker_id = aw.id
    ORDER BY 
        recommendation_score DESC,
        COALESCE(wr.avg_rating, 0) DESC;
END;
$$; 