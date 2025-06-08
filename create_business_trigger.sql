-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a new business for the user with all required fields
  INSERT INTO public.businesses (
    user_id, 
    name, 
    email, 
    phone, 
    address, 
    timezone, 
    has_workers, 
    subscription_tier, 
    max_clients
  )
  VALUES (
    NEW.id, 
    'My Business', 
    NEW.email,
    '',
    '',
    'America/New_York',
    true,
    'starter',
    100
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger to call the function when a new user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 
 
 