-- Fix worker availability system - Complete Migration
-- This migration creates missing tables and fixes RLS policies

-- 1. Create worker availability tables (if they don't exist)
CREATE TABLE IF NOT EXISTS worker_weekly_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL))
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_availability_worker ON worker_weekly_availability(worker_id);
CREATE INDEX IF NOT EXISTS idx_weekly_availability_day ON worker_weekly_availability(worker_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_exceptions_worker ON worker_availability_exceptions(worker_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON worker_availability_exceptions(worker_id, date);

-- 3. Enable RLS on availability tables
ALTER TABLE worker_weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_availability_exceptions ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies first
DROP POLICY IF EXISTS "Weekly availability viewable by all" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Weekly availability manageable by business admins" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Workers can view their own availability" ON worker_weekly_availability;
DROP POLICY IF EXISTS "Availability exceptions viewable by all" ON worker_availability_exceptions;
DROP POLICY IF EXISTS "Availability exceptions manageable by business admins" ON worker_availability_exceptions;
DROP POLICY IF EXISTS "Workers can view their own exceptions" ON worker_availability_exceptions;

-- 5. Create simple RLS policies - whoever signed up gets full access to their business data
CREATE POLICY "Business owners can manage all worker availability"
ON worker_weekly_availability FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_weekly_availability.worker_id
    AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_weekly_availability.worker_id
    AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all worker exceptions"
ON worker_availability_exceptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_availability_exceptions.worker_id
    AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workers w 
    JOIN businesses b ON w.business_id = b.id 
    WHERE w.id = worker_availability_exceptions.worker_id
    AND b.user_id = auth.uid()
  )
);

-- 6. Create overlap prevention function and trigger
CREATE OR REPLACE FUNCTION check_weekly_availability_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM worker_weekly_availability
    WHERE worker_id = NEW.worker_id
    AND day_of_week = NEW.day_of_week
    AND id != COALESCE(NEW.id, uuid_generate_v4())
    AND (
      (NEW.start_time < end_time AND NEW.end_time > start_time)
    )
  ) THEN
    RAISE EXCEPTION 'Overlapping availability times for worker on the same day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to check for overlaps
DROP TRIGGER IF EXISTS check_weekly_availability_overlap_trigger ON worker_weekly_availability;
CREATE TRIGGER check_weekly_availability_overlap_trigger
BEFORE INSERT OR UPDATE ON worker_weekly_availability
FOR EACH ROW EXECUTE FUNCTION check_weekly_availability_overlap();

-- 8. Create timestamp update function and triggers
CREATE OR REPLACE FUNCTION update_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_weekly_availability_timestamp ON worker_weekly_availability;
CREATE TRIGGER update_weekly_availability_timestamp
BEFORE UPDATE ON worker_weekly_availability
FOR EACH ROW EXECUTE FUNCTION update_availability_timestamp();

DROP TRIGGER IF EXISTS update_exception_timestamp ON worker_availability_exceptions;
CREATE TRIGGER update_exception_timestamp
BEFORE UPDATE ON worker_availability_exceptions
FOR EACH ROW EXECUTE FUNCTION update_availability_timestamp();

-- 9. Grant permissions to authenticated role
GRANT ALL ON worker_weekly_availability TO authenticated;
GRANT ALL ON worker_availability_exceptions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 