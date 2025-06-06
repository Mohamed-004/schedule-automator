-- Drop existing policies
DROP POLICY IF EXISTS "Workers are viewable by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be created by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be updated by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be deleted by their business" ON workers;

-- Create new policies with proper business ownership check
CREATE POLICY "Workers are viewable by their business"
ON workers FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be created by their business"
ON workers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be updated by their business"
ON workers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be deleted by their business"
ON workers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

-- Add debug logging function
CREATE OR REPLACE FUNCTION debug_worker_access()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Debug: auth.uid() = %, business_id = %', auth.uid(), NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for debugging
DROP TRIGGER IF EXISTS debug_worker_access_trigger ON workers;
CREATE TRIGGER debug_worker_access_trigger
    BEFORE INSERT OR UPDATE ON workers
    FOR EACH ROW
    EXECUTE FUNCTION debug_worker_access(); 
DROP POLICY IF EXISTS "Workers are viewable by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be created by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be updated by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be deleted by their business" ON workers;

-- Create new policies with proper business ownership check
CREATE POLICY "Workers are viewable by their business"
ON workers FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be created by their business"
ON workers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be updated by their business"
ON workers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

CREATE POLICY "Workers can be deleted by their business"
ON workers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM businesses
        WHERE businesses.id = workers.business_id
        AND businesses.user_id = auth.uid()
    )
);

-- Add debug logging function
CREATE OR REPLACE FUNCTION debug_worker_access()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'Debug: auth.uid() = %, business_id = %', auth.uid(), NEW.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for debugging
DROP TRIGGER IF EXISTS debug_worker_access_trigger ON workers;
CREATE TRIGGER debug_worker_access_trigger
    BEFORE INSERT OR UPDATE ON workers
    FOR EACH ROW
    EXECUTE FUNCTION debug_worker_access(); 
 