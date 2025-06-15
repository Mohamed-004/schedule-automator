-- Worker Swap & Smart Reschedule Database Schema
-- This file contains all database changes needed for the new features

-- 1. Worker swap requests tracking
CREATE TABLE IF NOT EXISTS worker_swap_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    original_worker_id UUID NOT NULL REFERENCES workers(id),
    requested_worker_id UUID REFERENCES workers(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')) DEFAULT 'pending',
    swap_reason TEXT,
    compatibility_score DECIMAL(5,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client reschedule tokens for secure links
CREATE TABLE IF NOT EXISTS client_reschedule_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    client_name TEXT,
    client_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Reschedule notifications log
CREATE TABLE IF NOT EXISTS reschedule_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('sms', 'email')),
    recipient_contact TEXT NOT NULL,
    message_content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add fallback date support to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fallback_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fallback_worker_id UUID REFERENCES workers(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS swap_priority INTEGER DEFAULT 0;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_swap_requests_job_id ON worker_swap_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_worker_swap_requests_status ON worker_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_reschedule_tokens_token ON client_reschedule_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_reschedule_tokens_expires ON client_reschedule_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_reschedule_notifications_job_id ON reschedule_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_notifications_status ON reschedule_notifications(status);

-- 6. Enable RLS on new tables
ALTER TABLE worker_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reschedule_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view swap requests for their business jobs"
ON worker_swap_requests FOR SELECT
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE user_id = auth.uid()
    )
));

CREATE POLICY "Users can create swap requests for their business jobs"
ON worker_swap_requests FOR INSERT
TO authenticated
WITH CHECK (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE user_id = auth.uid()
    )
));

CREATE POLICY "Users can update swap requests for their business jobs"
ON worker_swap_requests FOR UPDATE
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE user_id = auth.uid()
    )
));

-- Similar policies for other tables
CREATE POLICY "Users can manage reschedule tokens for their business jobs"
ON client_reschedule_tokens FOR ALL
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE user_id = auth.uid()
    )
));

CREATE POLICY "Users can manage reschedule notifications for their business jobs"
ON reschedule_notifications FOR ALL
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE user_id = auth.uid()
    )
));

-- 8. Worker compatibility scoring function
CREATE OR REPLACE FUNCTION calculate_worker_compatibility(
    p_job_id UUID,
    p_original_worker_id UUID,
    p_candidate_worker_id UUID
)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    worker_email TEXT,
    compatibility_score DECIMAL(5,2),
    availability_status TEXT,
    workload_impact DECIMAL(5,2),
    skill_match_score DECIMAL(5,2),
    reason TEXT
) AS $$
DECLARE
    v_job_record RECORD;
    v_business_timezone TEXT;
    v_candidate_record RECORD;
    v_base_score DECIMAL(5,2) := 50.0;
    v_availability_score DECIMAL(5,2) := 0.0;
    v_workload_score DECIMAL(5,2) := 0.0;
    v_final_score DECIMAL(5,2);
    v_status TEXT := 'available';
    v_reason TEXT := '';
BEGIN
    -- Get job details
    SELECT j.*, b.timezone INTO v_job_record
    FROM jobs j
    JOIN businesses b ON j.business_id = b.id
    WHERE j.id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    v_business_timezone := COALESCE(v_job_record.timezone, 'UTC');
    
    -- Get candidate worker details
    SELECT w.* INTO v_candidate_record
    FROM workers w
    WHERE w.id = p_candidate_worker_id
    AND w.business_id = v_job_record.business_id
    AND w.status = 'active';
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Check if worker is available for the job time
    IF is_worker_available(
        p_candidate_worker_id,
        v_job_record.scheduled_at,
        v_job_record.scheduled_at + (COALESCE(v_job_record.duration_minutes, 60) * INTERVAL '1 minute'),
        v_business_timezone
    ) THEN
        v_availability_score := 40.0;
        v_status := 'available';
        v_reason := 'Worker is available for the scheduled time';
    ELSE
        v_availability_score := 0.0;
        v_status := 'unavailable';
        v_reason := 'Worker is not available for the scheduled time';
    END IF;
    
    -- Calculate workload impact (prefer workers with lower current utilization)
    SELECT 
        CASE 
            WHEN daily_hours_worked < daily_hours_goal * 0.7 THEN 10.0
            WHEN daily_hours_worked < daily_hours_goal * 0.9 THEN 5.0
            ELSE 0.0
        END INTO v_workload_score
    FROM get_worker_schedule_summary(p_candidate_worker_id, v_job_record.scheduled_at::DATE);
    
    -- Calculate final compatibility score
    v_final_score := v_base_score + v_availability_score + v_workload_score;
    
    -- Return the result
    RETURN QUERY SELECT
        p_candidate_worker_id,
        v_candidate_record.name,
        v_candidate_record.email,
        v_final_score,
        v_status,
        v_workload_score,
        v_base_score,
        v_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get all compatible workers for a job
CREATE OR REPLACE FUNCTION get_compatible_workers_for_job(p_job_id UUID)
RETURNS TABLE (
    worker_id UUID,
    worker_name TEXT,
    worker_email TEXT,
    compatibility_score DECIMAL(5,2),
    availability_status TEXT,
    workload_impact DECIMAL(5,2),
    skill_match_score DECIMAL(5,2),
    reason TEXT
) AS $$
DECLARE
    v_job_record RECORD;
    v_original_worker_id UUID;
BEGIN
    -- Get job details
    SELECT j.worker_id INTO v_original_worker_id
    FROM jobs j
    WHERE j.id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Return compatibility scores for all workers except the original
    RETURN QUERY
    SELECT c.*
    FROM workers w
    CROSS JOIN LATERAL calculate_worker_compatibility(p_job_id, v_original_worker_id, w.id) c
    WHERE w.business_id = (SELECT business_id FROM jobs WHERE id = p_job_id)
    AND w.id != v_original_worker_id
    AND w.status = 'active'
    ORDER BY c.compatibility_score DESC, c.worker_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to generate reschedule options
CREATE OR REPLACE FUNCTION generate_reschedule_options(
    p_job_id UUID,
    p_days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE (
    suggested_date TIMESTAMPTZ,
    worker_id UUID,
    worker_name TEXT,
    confidence_score DECIMAL(5,2),
    reason TEXT
) AS $$
DECLARE
    v_job_record RECORD;
    v_business_timezone TEXT;
    v_current_date DATE;
    v_end_date DATE;
    v_time_slot TIME;
    v_duration_minutes INTEGER;
BEGIN
    -- Get job details
    SELECT j.*, b.timezone INTO v_job_record
    FROM jobs j
    JOIN businesses b ON j.business_id = b.id
    WHERE j.id = p_job_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    v_business_timezone := COALESCE(v_job_record.timezone, 'UTC');
    v_duration_minutes := COALESCE(v_job_record.duration_minutes, 60);
    v_time_slot := (v_job_record.scheduled_at AT TIME ZONE v_business_timezone)::TIME;
    
    -- Generate options for the next p_days_ahead days
    v_current_date := CURRENT_DATE + INTERVAL '1 day';
    v_end_date := v_current_date + (p_days_ahead * INTERVAL '1 day');
    
    -- For each day, check if the original worker is available at the same time
    WHILE v_current_date <= v_end_date LOOP
        DECLARE
            v_suggested_datetime TIMESTAMPTZ;
            v_is_available BOOLEAN;
        BEGIN
            v_suggested_datetime := (v_current_date || ' ' || v_time_slot)::TIMESTAMPTZ AT TIME ZONE v_business_timezone;
            
            -- Check if original worker is available
            SELECT is_worker_available(
                v_job_record.worker_id,
                v_suggested_datetime,
                v_suggested_datetime + (v_duration_minutes * INTERVAL '1 minute'),
                v_business_timezone
            ) INTO v_is_available;
            
            IF v_is_available THEN
                RETURN QUERY SELECT
                    v_suggested_datetime,
                    v_job_record.worker_id,
                    (SELECT name FROM workers WHERE id = v_job_record.worker_id),
                    95.0::DECIMAL(5,2),
                    'Same worker, same time slot'::TEXT;
            END IF;
        END;
        
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    -- Also suggest alternative workers for the original time slot
    RETURN QUERY
    SELECT
        v_job_record.scheduled_at,
        c.worker_id,
        c.worker_name,
        c.compatibility_score,
        'Alternative worker for original time slot'::TEXT
    FROM get_compatible_workers_for_job(p_job_id) c
    WHERE c.availability_status = 'available'
    ORDER BY c.compatibility_score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to create reschedule token
CREATE OR REPLACE FUNCTION create_reschedule_token(
    p_job_id UUID,
    p_expires_hours INTEGER DEFAULT 72
)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
    v_job_record RECORD;
BEGIN
    -- Get job and client details
    SELECT j.*, c.name as client_name, c.phone, c.email
    INTO v_job_record
    FROM jobs j
    JOIN clients c ON j.client_id = c.id
    WHERE j.id = p_job_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found';
    END IF;
    
    -- Generate secure token
    v_token := encode(gen_random_bytes(32), 'base64url');
    
    -- Insert token record
    INSERT INTO client_reschedule_tokens (
        job_id,
        token,
        expires_at,
        client_name,
        client_contact
    ) VALUES (
        p_job_id,
        v_token,
        NOW() + (p_expires_hours * INTERVAL '1 hour'),
        v_job_record.client_name,
        COALESCE(v_job_record.phone, v_job_record.email)
    );
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant permissions
GRANT ALL ON worker_swap_requests TO authenticated;
GRANT ALL ON client_reschedule_tokens TO authenticated;
GRANT ALL ON reschedule_notifications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 