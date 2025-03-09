-- Function to delete all messages for a user
CREATE OR REPLACE FUNCTION public.delete_user_messages(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete messages directly with a join to get around foreign key constraints
  DELETE FROM public.messages
  WHERE chat_id IN (
    SELECT id FROM public.chats WHERE user_id = user_uuid::text
  );
  
  RETURN;
END;
$$;

-- Function to delete all chats for a user
CREATE OR REPLACE FUNCTION public.delete_user_chats(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Now that messages are deleted, we can delete the chats
  DELETE FROM public.chats
  WHERE user_id = user_uuid::text;
  
  RETURN;
END;
$$;

-- Function to delete user settings
CREATE OR REPLACE FUNCTION public.delete_user_settings(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user settings if the table exists
  BEGIN
    DELETE FROM public.user_settings
    WHERE user_id = user_uuid;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'user_settings table does not exist';
    WHEN undefined_column THEN
      RAISE NOTICE 'user_id column does not exist in user_settings table';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Error deleting user settings: %', SQLERRM;
  END;
  
  RETURN;
END;
$$; 