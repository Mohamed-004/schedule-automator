-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for businesses table
CREATE POLICY "Businesses are viewable by authenticated users"
ON businesses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Businesses can be created by authenticated users"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Businesses can be updated by their owners"
ON businesses FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Businesses can be deleted by their owners"
ON businesses FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Create policies for workers table
CREATE POLICY "Workers are viewable by their business"
ON workers FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Workers can be created by their business"
ON workers FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Workers can be updated by their business"
ON workers FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Workers can be deleted by their business"
ON workers FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

-- Create policies for clients table
CREATE POLICY "Clients are viewable by their business"
ON clients FOR SELECT
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Clients can be created by their business"
ON clients FOR INSERT
TO authenticated
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Clients can be updated by their business"
ON clients FOR UPDATE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
))
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Clients can be deleted by their business"
ON clients FOR DELETE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

-- Create policies for jobs table
CREATE POLICY "Jobs are viewable by their business"
ON jobs FOR SELECT
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Jobs can be created by their business"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Jobs can be updated by their business"
ON jobs FOR UPDATE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
))
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Jobs can be deleted by their business"
ON jobs FOR DELETE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

-- Create policies for reminders table
CREATE POLICY "Reminders are viewable by their business"
ON reminders FOR SELECT
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reminders can be created by their business"
ON reminders FOR INSERT
TO authenticated
WITH CHECK (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reminders can be updated by their business"
ON reminders FOR UPDATE
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
))
WITH CHECK (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reminders can be deleted by their business"
ON reminders FOR DELETE
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

-- Create policies for reschedule_requests table
CREATE POLICY "Reschedule requests are viewable by their business"
ON reschedule_requests FOR SELECT
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reschedule requests can be created by their business"
ON reschedule_requests FOR INSERT
TO authenticated
WITH CHECK (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reschedule requests can be updated by their business"
ON reschedule_requests FOR UPDATE
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
))
WITH CHECK (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

CREATE POLICY "Reschedule requests can be deleted by their business"
ON reschedule_requests FOR DELETE
TO authenticated
USING (job_id IN (
    SELECT id FROM jobs
    WHERE business_id IN (
        SELECT id FROM businesses
        WHERE id = business_id
    )
));

-- Create policies for notifications table
CREATE POLICY "Notifications are viewable by their business"
ON notifications FOR SELECT
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Notifications can be created by their business"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Notifications can be updated by their business"
ON notifications FOR UPDATE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
))
WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
));

CREATE POLICY "Notifications can be deleted by their business"
ON notifications FOR DELETE
TO authenticated
USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = business_id
)); 
 
 