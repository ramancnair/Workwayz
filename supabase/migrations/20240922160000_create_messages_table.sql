-- Migration: Create internal messages table and configure realtime & RLS
-- Description: Adds the public.messages table for internal messaging and notification support.

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT,
    "senderAvatar" TEXT,
    recipients JSONB DEFAULT '[]'::JSONB,
    "recipientUserIds" TEXT[] DEFAULT '{}',
    "distroIds" TEXT[] DEFAULT '{}',
    subject TEXT DEFAULT '(No Subject)',
    body TEXT DEFAULT '',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "readBy" TEXT[] DEFAULT '{}',
    "starredBy" TEXT[] DEFAULT '{}',
    "deletedBy" TEXT[] DEFAULT '{}',
    "purgedBy" TEXT[] DEFAULT '{}',
    "replyToId" TEXT
);

-- Performance indexes for messaging queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_recipient_user_ids ON public.messages USING GIN("recipientUserIds");

-- Grant access to standard roles
GRANT ALL ON TABLE public.messages TO anon, authenticated, service_role;

-- Enable Row Level Security and allow full access policy
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access for all roles" ON public.messages;
CREATE POLICY "Allow full access for all roles" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

