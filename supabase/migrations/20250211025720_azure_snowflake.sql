/*
  # Create Messages Table for Chat Application

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `content` (text, message content)
      - `user_id` (text, reference to the user who sent the message)
      - `username` (text, display name of the sender)
      - `created_at` (timestamp with timezone, when the message was sent)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for:
      - Anyone can read messages
      - Authenticated users can insert messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id text NOT NULL,
  username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY "Authenticated users can insert messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);