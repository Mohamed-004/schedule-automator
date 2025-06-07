-- Weekly recurring availability
CREATE TABLE IF NOT EXISTS worker_weekly_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specific date exceptions (time off, special availability)
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
  -- All day exception if times are NULL, specific hours if provided
  CHECK ((start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_weekly_availability_worker ON worker_weekly_availability(worker_id);
CREATE INDEX IF NOT EXISTS idx_weekly_availability_day ON worker_weekly_availability(worker_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_exceptions_worker ON worker_availability_exceptions(worker_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON worker_availability_exceptions(worker_id, date);

-- Function to prevent overlapping availability for the same worker on the same day
CREATE OR REPLACE FUNCTION check_weekly_availability_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM worker_weekly_availability
    WHERE worker_id = NEW.worker_id
    AND day_of_week = NEW.day_of_week
    AND id != NEW.id
    AND (
      (NEW.start_time < end_time AND NEW.end_time > start_time)
    )
  ) THEN
    RAISE EXCEPTION 'Overlapping availability times for worker on the same day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for overlaps when inserting or updating
CREATE TRIGGER check_weekly_availability_overlap_trigger
BEFORE INSERT OR UPDATE ON worker_weekly_availability
FOR EACH ROW EXECUTE FUNCTION check_weekly_availability_overlap();

-- Update the updated_at timestamp on changes
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_availability_timestamp
BEFORE UPDATE ON worker_weekly_availability
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_exception_timestamp
BEFORE UPDATE ON worker_availability_exceptions
FOR EACH ROW EXECUTE FUNCTION update_timestamp(); 