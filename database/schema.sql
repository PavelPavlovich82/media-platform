-- PostgreSQL Schema for Media Upload Platform

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Content types
CREATE TYPE content_type AS ENUM ('photo', 'video', 'text', 'voice');

-- Processing statuses
CREATE TYPE processing_status AS ENUM (
    'uploading',           -- File is being uploaded
    'pending',            -- Waiting for processing
    'processing',         -- Being processed in n8n
    'awaiting_decision',  -- Waiting for user decision
    'approved',           -- User approved
    'rejected',           -- User rejected
    'completed',          -- Final processing completed
    'failed'              -- Processing failed
);

-- ============================================================================
-- UPLOADS TABLE
-- ============================================================================
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    status processing_status DEFAULT 'uploading',

    -- Cloudinary data
    cloudinary_public_id VARCHAR(500),
    cloudinary_url TEXT,
    cloudinary_secure_url TEXT,

    -- Text content (for text/voice types)
    text_content TEXT,

    -- File metadata
    original_filename VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),

    -- Processing tracking
    n8n_workflow_id VARCHAR(255),
    processing_attempts INTEGER DEFAULT 0,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_cloudinary_or_text CHECK (
        (content_type IN ('photo', 'video') AND cloudinary_public_id IS NOT NULL) OR
        (content_type IN ('text', 'voice') AND text_content IS NOT NULL)
    )
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_created_at ON uploads(created_at DESC);
CREATE INDEX idx_uploads_user_status ON uploads(user_id, status);

-- ============================================================================
-- PROCESSING RESULTS TABLE
-- ============================================================================
CREATE TABLE processing_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,

    -- Results from n8n
    result_data JSONB NOT NULL,
    result_preview TEXT,
    result_media_url TEXT,

    -- User decision
    user_decision VARCHAR(50),
    decision_timestamp TIMESTAMP,
    decision_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processing_results_upload_id ON processing_results(upload_id);
CREATE INDEX idx_processing_results_created_at ON processing_results(created_at DESC);

-- ============================================================================
-- ACTIVITY LOGS TABLE
-- ============================================================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_upload_id ON activity_logs(upload_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_results_updated_at BEFORE UPDATE ON processing_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for user uploads with latest processing result
CREATE VIEW user_uploads_with_results AS
SELECT
    u.id,
    u.user_id,
    u.content_type,
    u.status,
    u.cloudinary_secure_url,
    u.text_content,
    u.original_filename,
    u.created_at,
    u.updated_at,
    pr.result_preview,
    pr.result_media_url,
    pr.user_decision,
    pr.decision_timestamp
FROM uploads u
LEFT JOIN LATERAL (
    SELECT *
    FROM processing_results
    WHERE upload_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) pr ON true;

-- ============================================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================================

-- Uncomment to add sample user (password: 'test123')
-- INSERT INTO users (email, password_hash) VALUES
-- ('test@example.com', crypt('test123', gen_salt('bf')));

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old activity logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts for the media upload platform';
COMMENT ON TABLE sessions IS 'User authentication sessions';
COMMENT ON TABLE uploads IS 'Media uploads (photos, videos, text, voice)';
COMMENT ON TABLE processing_results IS 'Processing results from n8n workflows';
COMMENT ON TABLE activity_logs IS 'Audit log of user and system activities';

COMMENT ON COLUMN uploads.status IS 'Current processing status: uploading → pending → processing → awaiting_decision → approved/rejected → completed';
COMMENT ON COLUMN uploads.processing_attempts IS 'Number of times processing was attempted (for retry logic)';
COMMENT ON COLUMN processing_results.result_data IS 'Flexible JSONB structure for any data returned from n8n';
COMMENT ON COLUMN processing_results.user_decision IS 'User decision: approve, reject, or retry';
