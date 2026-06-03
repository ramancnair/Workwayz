-- Supabase Migration to support Firebase NoSQL compatibility layer

CREATE TABLE IF NOT EXISTS firebase_compat (
    path TEXT PRIMARY KEY,
    collection_name TEXT NOT NULL,
    project_id TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by collection within a project
CREATE INDEX IF NOT EXISTS idx_firebase_compat_collection 
ON firebase_compat(project_id, collection_name);

-- Index for querying by data fields (useful for Firestore 'where' clauses)
CREATE INDEX IF NOT EXISTS idx_firebase_compat_data 
ON firebase_compat USING GIN (data);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE firebase_compat;
