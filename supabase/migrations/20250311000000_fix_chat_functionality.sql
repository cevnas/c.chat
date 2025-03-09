/*
  # Fix Chat Functionality

  This migration ensures that:
  1. The chats table has the correct structure
  2. The messages table has the correct foreign key relationship
  3. The RLS policies are properly configured
*/

-- Ensure user_id in chats table is text type to match auth.uid()
ALTER TABLE chats ALTER COLUMN user_id TYPE text;

-- Make sure chat_id is required in messages
ALTER TABLE messages ALTER COLUMN chat_id SET NOT NULL;

-- Recreate policies with correct user_id type
DROP POLICY IF EXISTS "Users can manage their own chats" ON chats;
CREATE POLICY "Users can manage their own chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate message policies with correct user_id type
DROP POLICY IF EXISTS "Users can read messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their chats" ON messages;

CREATE POLICY "Users can read messages from their chats"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their chats"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_id
      AND chats.user_id = auth.uid()
    )
  ); 