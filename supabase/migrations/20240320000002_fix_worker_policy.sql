-- Drop existing policies
DROP POLICY IF EXISTS "Workers are viewable by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be created by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be updated by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be deleted by their business" ON workers;

-- Create new policies
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
DROP POLICY IF EXISTS "Workers are viewable by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be created by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be updated by their business" ON workers;
DROP POLICY IF EXISTS "Workers can be deleted by their business" ON workers;

-- Create new policies
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
 