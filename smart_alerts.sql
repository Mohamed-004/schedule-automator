-- Create notifications table for the smart alerts system
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Optional specific user target
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) NOT NULL,  -- 'overtime_risk', 'unassigned_job', 'conflict', etc.
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error'
    related_entity_type VARCHAR(50),  -- 'job', 'worker', etc.
    related_entity_id UUID,  -- Reference to the relevant entity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    actions JSONB  -- Store potential actions that can be taken
);

-- Add RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_business_access ON notifications
    USING (
        business_id = (SELECT business_id FROM users WHERE id = auth.uid()) OR
        user_id = auth.uid()
    );

-- Function to detect workers approaching overtime (runs periodically)
CREATE OR REPLACE FUNCTION detect_overtime_risks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_business RECORD;
    r_worker RECORD;
    v_weekly_hours DECIMAL;
    v_weekly_goal DECIMAL;
    v_threshold DECIMAL := 0.9; -- Alert at 90% of weekly goal
BEGIN
    -- For each business
    FOR r_business IN SELECT id, name, timezone FROM businesses LOOP
        -- For each active worker in the business
        FOR r_worker IN 
            SELECT 
                w.id, 
                w.name, 
                w.weekly_hours_goal,
                b.timezone
            FROM 
                workers w
            JOIN 
                businesses b ON w.business_id = b.id
            WHERE 
                w.business_id = r_business.id
                AND w.status = 'active'
                AND w.weekly_hours_goal > 0
        LOOP
            -- Calculate total hours worked this week
            SELECT 
                SUM(j.duration_minutes) / 60.0 INTO v_weekly_hours
            FROM 
                jobs j
            WHERE 
                j.worker_id = r_worker.id
                AND j.scheduled_at >= date_trunc('week', NOW() AT TIME ZONE r_worker.timezone)
                AND j.scheduled_at < date_trunc('week', NOW() AT TIME ZONE r_worker.timezone) + INTERVAL '1 week';
            
            -- If worker is approaching their weekly goal
            IF v_weekly_hours >= (r_worker.weekly_hours_goal * v_threshold) THEN
                -- Check if we already created an alert for this worker this week
                IF NOT EXISTS (
                    SELECT 1 FROM notifications 
                    WHERE 
                        business_id = r_business.id
                        AND alert_type = 'overtime_risk'
                        AND related_entity_type = 'worker'
                        AND related_entity_id = r_worker.id
                        AND created_at >= date_trunc('week', NOW() AT TIME ZONE r_worker.timezone)
                ) THEN
                    -- Create overtime risk notification
                    INSERT INTO notifications (
                        business_id,
                        title,
                        message,
                        alert_type,
                        severity,
                        related_entity_type,
                        related_entity_id,
                        actions
                    ) VALUES (
                        r_business.id,
                        'Worker Approaching Overtime',
                        r_worker.name || ' has worked ' || ROUND(v_weekly_hours, 1) || ' hours out of ' || 
                        r_worker.weekly_hours_goal || ' this week (' || 
                        ROUND((v_weekly_hours / r_worker.weekly_hours_goal) * 100, 0) || '%).',
                        'overtime_risk',
                        CASE 
                            WHEN v_weekly_hours >= r_worker.weekly_hours_goal THEN 'error'
                            WHEN v_weekly_hours >= (r_worker.weekly_hours_goal * 0.95) THEN 'warning'
                            ELSE 'info'
                        END,
                        'worker',
                        r_worker.id,
                        jsonb_build_array(
                            jsonb_build_object(
                                'label', 'View Schedule',
                                'link', '/dashboard/schedule?worker=' || r_worker.id
                            ),
                            jsonb_build_object(
                                'label', 'Adjust Hours',
                                'link', '/dashboard/team/availability/' || r_worker.id
                            )
                        )
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Function to detect unassigned jobs that are approaching (runs periodically)
CREATE OR REPLACE FUNCTION detect_unassigned_jobs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_job RECORD;
    v_hours_until_job DECIMAL;
BEGIN
    -- Find jobs in the next 24 hours that don't have a worker assigned
    FOR r_job IN 
        SELECT 
            j.id,
            j.title,
            j.business_id,
            j.scheduled_at,
            c.name as client_name,
            EXTRACT(EPOCH FROM (j.scheduled_at - NOW())) / 3600 as hours_until_job
        FROM 
            jobs j
        JOIN
            clients c ON j.client_id = c.id
        WHERE 
            j.worker_id IS NULL
            AND j.scheduled_at > NOW()
            AND j.scheduled_at < NOW() + INTERVAL '24 hours'
            AND j.status = 'scheduled'
    LOOP
        v_hours_until_job := r_job.hours_until_job;
        
        -- Determine if we should send an alert based on how soon the job is
        IF (v_hours_until_job <= 24 AND v_hours_until_job > 12) OR   -- First alert at 24 hours
           (v_hours_until_job <= 12 AND v_hours_until_job > 4) OR    -- Second alert at 12 hours
           (v_hours_until_job <= 4)                                  -- Final alert at 4 hours
        THEN
            -- Check if we already created an alert for this job in this time window
            IF NOT EXISTS (
                SELECT 1 FROM notifications 
                WHERE 
                    business_id = r_job.business_id
                    AND alert_type = 'unassigned_job'
                    AND related_entity_type = 'job'
                    AND related_entity_id = r_job.id
                    AND created_at >= 
                        CASE
                            WHEN v_hours_until_job <= 4 THEN NOW() - INTERVAL '1 hour'
                            WHEN v_hours_until_job <= 12 THEN NOW() - INTERVAL '4 hours'
                            ELSE NOW() - INTERVAL '12 hours'
                        END
            ) THEN
                -- Create unassigned job notification
                INSERT INTO notifications (
                    business_id,
                    title,
                    message,
                    alert_type,
                    severity,
                    related_entity_type,
                    related_entity_id,
                    actions
                ) VALUES (
                    r_job.business_id,
                    'Unassigned Job Alert',
                    'Job "' || r_job.title || '" for ' || r_job.client_name || 
                    ' starts in ' || ROUND(v_hours_until_job, 1) || ' hours and has no assigned worker.',
                    'unassigned_job',
                    CASE 
                        WHEN v_hours_until_job <= 4 THEN 'error'
                        WHEN v_hours_until_job <= 12 THEN 'warning'
                        ELSE 'info'
                    END,
                    'job',
                    r_job.id,
                    jsonb_build_array(
                        jsonb_build_object(
                            'label', 'Assign Worker',
                            'link', '/dashboard/jobs/' || r_job.id || '/edit'
                        ),
                        jsonb_build_object(
                            'label', 'View Details',
                            'link', '/dashboard/jobs/' || r_job.id
                        )
                    )
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Function to detect scheduling conflicts
CREATE OR REPLACE FUNCTION detect_scheduling_conflicts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_conflict RECORD;
BEGIN
    -- Find jobs where the same worker is scheduled for overlapping times
    FOR r_conflict IN 
        WITH job_times AS (
            SELECT 
                j1.id as job1_id,
                j1.title as job1_title,
                j1.scheduled_at as job1_start,
                j1.scheduled_at + make_interval(mins => j1.duration_minutes) as job1_end,
                j1.worker_id,
                j1.business_id,
                j2.id as job2_id,
                j2.title as job2_title,
                j2.scheduled_at as job2_start,
                j2.scheduled_at + make_interval(mins => j2.duration_minutes) as job2_end
            FROM 
                jobs j1
            JOIN 
                jobs j2 ON j1.worker_id = j2.worker_id
                AND j1.id != j2.id
                AND j1.status = 'scheduled'
                AND j2.status = 'scheduled'
                AND j1.worker_id IS NOT NULL
            WHERE 
                -- Overlapping times
                (j1.scheduled_at < (j2.scheduled_at + make_interval(mins => j2.duration_minutes)))
                AND ((j1.scheduled_at + make_interval(mins => j1.duration_minutes)) > j2.scheduled_at)
                -- Only look at future jobs
                AND j1.scheduled_at > NOW()
        )
        SELECT 
            jt.business_id,
            jt.worker_id,
            jt.job1_id,
            jt.job1_title,
            jt.job1_start,
            jt.job1_end,
            jt.job2_id,
            jt.job2_title,
            jt.job2_start,
            jt.job2_end,
            w.name as worker_name
        FROM 
            job_times jt
        JOIN 
            workers w ON jt.worker_id = w.id
        -- Ensure we only get each conflict once (job1_id < job2_id means we'll only get one combination)
        WHERE jt.job1_id < jt.job2_id
    LOOP
        -- Check if we already created an alert for this specific conflict
        IF NOT EXISTS (
            SELECT 1 FROM notifications 
            WHERE 
                business_id = r_conflict.business_id
                AND alert_type = 'scheduling_conflict'
                AND ((related_entity_id = r_conflict.job1_id AND actions::text LIKE '%' || r_conflict.job2_id || '%')
                     OR
                     (related_entity_id = r_conflict.job2_id AND actions::text LIKE '%' || r_conflict.job1_id || '%'))
                AND created_at >= NOW() - INTERVAL '24 hours'
        ) THEN
            -- Create scheduling conflict notification
            INSERT INTO notifications (
                business_id,
                title,
                message,
                alert_type,
                severity,
                related_entity_type,
                related_entity_id,
                actions
            ) VALUES (
                r_conflict.business_id,
                'Scheduling Conflict Detected',
                r_conflict.worker_name || ' is scheduled for two overlapping jobs: "' || 
                r_conflict.job1_title || '" and "' || r_conflict.job2_title || '".',
                'scheduling_conflict',
                'error',
                'job',
                r_conflict.job1_id,
                jsonb_build_array(
                    jsonb_build_object(
                        'label', 'Fix First Job',
                        'link', '/dashboard/jobs/' || r_conflict.job1_id || '/edit'
                    ),
                    jsonb_build_object(
                        'label', 'Fix Second Job',
                        'link', '/dashboard/jobs/' || r_conflict.job2_id || '/edit'
                    ),
                    jsonb_build_object(
                        'label', 'View Worker Schedule',
                        'link', '/dashboard/schedule?worker=' || r_conflict.worker_id
                    )
                )
            );
        END IF;
    END LOOP;
END;
$$;

-- Create a function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = p_notification_id
    AND (
        business_id = (SELECT business_id FROM users WHERE id = auth.uid()) OR
        user_id = auth.uid()
    );
END;
$$;

-- Create a function to dismiss a notification
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET dismissed_at = NOW()
    WHERE id = p_notification_id
    AND (
        business_id = (SELECT business_id FROM users WHERE id = auth.uid()) OR
        user_id = auth.uid()
    );
END;
$$;

-- If using pg_cron extension, add scheduled jobs to run alerts
-- Uncomment these if you have pg_cron installed and configured
-- 
-- SELECT cron.schedule('*/30 * * * *', $$SELECT detect_overtime_risks()$$);
-- SELECT cron.schedule('*/15 * * * *', $$SELECT detect_unassigned_jobs()$$);
-- SELECT cron.schedule('*/15 * * * *', $$SELECT detect_scheduling_conflicts()$$); 