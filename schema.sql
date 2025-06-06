-- Create businesses table
CREATE TABLE businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create workers table
CREATE TABLE workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create clients table
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create jobs table
CREATE TABLE jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create reminders table
CREATE TABLE reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for businesses
CREATE POLICY "Users can view their own business"
ON businesses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business"
ON businesses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business"
ON businesses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business"
ON businesses FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for workers
CREATE POLICY "Users can view their business workers"
ON workers FOR SELECT
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create workers for their business"
ON workers FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update their business workers"
ON workers FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their business workers"
ON workers FOR DELETE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = workers.business_id
    AND businesses.user_id = auth.uid()
));

-- Create policies for clients
CREATE POLICY "Users can view their business clients"
ON clients FOR SELECT
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = clients.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create clients for their business"
ON clients FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = clients.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update their business clients"
ON clients FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = clients.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their business clients"
ON clients FOR DELETE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = clients.business_id
    AND businesses.user_id = auth.uid()
));

-- Create policies for jobs
CREATE POLICY "Users can view their business jobs"
ON jobs FOR SELECT
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create jobs for their business"
ON jobs FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update their business jobs"
ON jobs FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their business jobs"
ON jobs FOR DELETE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = jobs.business_id
    AND businesses.user_id = auth.uid()
));

-- Create policies for reminders
CREATE POLICY "Users can view their business reminders"
ON reminders FOR SELECT
USING (EXISTS (
    SELECT 1 FROM jobs
    JOIN businesses ON businesses.id = jobs.business_id
    WHERE jobs.id = reminders.job_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create reminders for their business jobs"
ON reminders FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM jobs
    JOIN businesses ON businesses.id = jobs.business_id
    WHERE jobs.id = reminders.job_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update their business reminders"
ON reminders FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM jobs
    JOIN businesses ON businesses.id = jobs.business_id
    WHERE jobs.id = reminders.job_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their business reminders"
ON reminders FOR DELETE
USING (EXISTS (
    SELECT 1 FROM jobs
    JOIN businesses ON businesses.id = jobs.business_id
    WHERE jobs.id = reminders.job_id
    AND businesses.user_id = auth.uid()
));

-- Create policies for notifications
CREATE POLICY "Users can view their business notifications"
ON notifications FOR SELECT
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = notifications.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can create notifications for their business"
ON notifications FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = notifications.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can update their business notifications"
ON notifications FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = notifications.business_id
    AND businesses.user_id = auth.uid()
));

CREATE POLICY "Users can delete their business notifications"
ON notifications FOR DELETE
USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = notifications.business_id
    AND businesses.user_id = auth.uid()
)); 
 
 