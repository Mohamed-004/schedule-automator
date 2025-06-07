-- Worker Availability Table
CREATE TABLE IF NOT EXISTS worker_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_worker_availability_worker_day ON worker_availability(worker_id, day_of_week); 