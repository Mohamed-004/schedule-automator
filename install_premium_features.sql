-- Install Premium Features
-- This script consolidates all premium feature installations into a single file

BEGIN;

-- Create worker skills schema
\echo 'Creating worker skills and ratings tables...'
\ir worker_skills_schema.sql

-- Create worker recommendation function
\echo 'Creating worker recommendation function...'
\ir worker_recommendation.sql

-- Create schedule optimizer
\echo 'Creating schedule optimizer function...'
\ir schedule_optimizer.sql

-- Create smart alerts system
\echo 'Creating smart alerts system...'
\ir smart_alerts.sql

-- Add sample data (optional - comment out if not needed)
\echo 'Adding sample data...'

-- Add sample job types if none exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM job_types LIMIT 1) THEN
        INSERT INTO job_types (name, description, required_skills) VALUES
        ('Landscaping', 'General landscaping services', ARRAY['lawn maintenance', 'garden care', 'pruning']),
        ('Plumbing', 'Plumbing repairs and installations', ARRAY['pipe fitting', 'leak repair', 'fixture installation']),
        ('Electrical', 'Electrical installations and repairs', ARRAY['wiring', 'panel installation', 'lighting']),
        ('Cleaning', 'Residential and commercial cleaning', ARRAY['deep cleaning', 'floor care', 'window cleaning']),
        ('Painting', 'Interior and exterior painting', ARRAY['surface preparation', 'color matching', 'finishing']);
    END IF;
END $$;

-- Run initial alerts detection
\echo 'Running initial alerts detection...'
SELECT detect_overtime_risks();
SELECT detect_unassigned_jobs();
SELECT detect_scheduling_conflicts();

-- If using pg_cron, uncomment to set up recurring jobs
-- \echo 'Setting up recurring alert jobs...'
-- SELECT cron.schedule('*/30 * * * *', $$SELECT detect_overtime_risks()$$);
-- SELECT cron.schedule('*/15 * * * *', $$SELECT detect_unassigned_jobs()$$);
-- SELECT cron.schedule('*/15 * * * *', $$SELECT detect_scheduling_conflicts()$$);

\echo 'Premium features installation complete!'
COMMIT; 