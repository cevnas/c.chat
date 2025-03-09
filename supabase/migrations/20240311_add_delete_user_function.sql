-- Create a function to delete a user and their data
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the user ID from the current session
  current_user_id := auth.uid();
  
  -- Check if the user exists
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Delete user's messages
  DELETE FROM public.messages WHERE user_id = current_user_id::text;
  
  -- Delete user's chats
  DELETE FROM public.chats WHERE user_id = current_user_id::text;
  
  -- Delete user's settings
  DELETE FROM public.user_settings WHERE user_id = current_user_id;
  
  -- Note: We can't delete the actual auth.users record from here
  -- The user will need to be deleted by an admin or through the Supabase dashboard
  
  RETURN;
END;
$$; 