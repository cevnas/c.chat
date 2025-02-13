/*
  # Create chats table and update messages table

  1. New Tables
    - `chats`
      - `id` (uuid, primary key)
      - `title` (text)
      - `user_id` (text, references auth.users)
      - `created_at` (timestamp)

  2. Changes
    - Add `chat_id` and `is_ai` columns to messages table
    - Add foreign key constraint from messages to chats

  3. Security
    - Enable RLS on chats table
    - Add policies for users to manage their own chats
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Add policies for chats
CREATE POLICY "Users can manage their own chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (auth.uid()::uuid = user_id)
  WITH CHECK (auth.uid()::uuid = user_id);

-- Add new columns to messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS chat_id uuid REFERENCES chats(id),
ADD COLUMN IF NOT EXISTS is_ai boolean DEFAULT false;

-- Update messages policies
DROP POLICY IF EXISTS "Anyone can read messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;

CREATE POLICY "Users can read messages from their chats"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()::uuid
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
      AND chats.user_id = auth.uid()::uuid
    )
  );