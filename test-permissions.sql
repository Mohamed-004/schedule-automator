 -- ===================================
-- PERMISSION TESTING SCRIPT
-- Run this in Supabase SQL Editor to test the permission system
-- ===================================

-- First, let's check if our test data exists
SELECT 'Checking test data...' as status;

SELECT b.name, b.email as business_email, w.name as worker_name, w.email as worker_email
FROM businesses b
LEFT JOIN workers w ON b.id = w.business_id
WHERE b.email = 'business@example.com' OR w.email = 'worker@example.com';

-- Test 1: Insert test availability as business admin
SELECT 'Test 1: Business admin creating worker availability...' as test;

-- This should work (business admin managing worker availability)
INSERT INTO worker_weekly_availability (worker_id, day_of_week, start_time, end_time)
VALUES (
  '1b46dfc1-3dfa-4036-8d05-2a9218fc6524'::UUID,
  1, -- Monday
  '09:00',
  '17:00'
) ON CONFLICT DO NOTHING;

-- Test 2: Check if data was inserted
SELECT 'Test 2: Verifying availability was created...' as test;

SELECT w.name, w.email, wa.day_of_week, wa.start_time, wa.end_time
FROM worker_weekly_availability wa
JOIN workers w ON wa.worker_id = w.id
WHERE wa.worker_id = '1b46dfc1-3dfa-4036-8d05-2a9218fc6524'::UUID;

-- Test 3: Insert test exception
SELECT 'Test 3: Business admin creating worker exception...' as test;

INSERT INTO worker_availability_exceptions (worker_id, date, is_available, reason)
VALUES (
  '1b46dfc1-3dfa-4036-8d05-2a9218fc6524'::UUID,
  '2024-12-25', -- Christmas
  false,
  'Holiday - Christmas Day'
) ON CONFLICT DO NOTHING;

-- Test 4: Verify exception was created
SELECT 'Test 4: Verifying exception was created...' as test;

SELECT w.name, w.email, ex.date, ex.is_available, ex.reason
FROM worker_availability_exceptions ex
JOIN workers w ON ex.worker_id = w.id
WHERE ex.worker_id = '1b46dfc1-3dfa-4036-8d05-2a9218fc6524'::UUID;

-- Test 5: Check RLS policies are working
SELECT 'Test 5: Checking RLS policies...' as test;

-- This should show policy info
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('worker_weekly_availability', 'worker_availability_exceptions')
ORDER BY tablename, policyname;

SELECT 'Permission testing completed!' as status; 