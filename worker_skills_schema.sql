-- Create worker skills table
CREATE TABLE IF NOT EXISTS worker_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5), -- 1-5 skill level
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, skill) -- Each worker can have a skill listed only once
);

-- Create job_types table for categorizing jobs
CREATE TABLE IF NOT EXISTS job_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    required_skills VARCHAR(100)[] -- Array of skills typically needed for this job type
);

-- Create worker ratings table
CREATE TABLE IF NOT EXISTS worker_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5 star rating
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, worker_id) -- One rating per worker per job
);

-- Create approximate worker locations table for distance calculations
CREATE TABLE IF NOT EXISTS worker_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id) -- One location per worker
);

-- Add security policies
ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
CREATE POLICY worker_skills_business_access ON worker_skills
    USING (
        worker_id IN (
            SELECT id FROM workers WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY job_types_business_access ON job_types
    USING (true);

CREATE POLICY worker_ratings_business_access ON worker_ratings
    USING (
        worker_id IN (
            SELECT id FROM workers WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY worker_locations_business_access ON worker_locations
    USING (
        worker_id IN (
            SELECT id FROM workers WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Sample data for job types
INSERT INTO job_types (name, description, required_skills) VALUES
('Landscaping', 'General landscaping services', ARRAY['lawn maintenance', 'garden care', 'pruning']),
('Plumbing', 'Plumbing repairs and installations', ARRAY['pipe fitting', 'leak repair', 'fixture installation']),
('Electrical', 'Electrical installations and repairs', ARRAY['wiring', 'panel installation', 'lighting']),
('Cleaning', 'Residential and commercial cleaning', ARRAY['deep cleaning', 'floor care', 'window cleaning']),
('Painting', 'Interior and exterior painting', ARRAY['surface preparation', 'color matching', 'finishing']);

-- Add a job_type_id column to the jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type_id UUID REFERENCES job_types(id); 