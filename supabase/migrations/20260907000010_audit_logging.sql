-- ============================================================================
-- Migration: 20260907000010_audit_logging.sql
-- Description: Healthcare legal audit trail (HIPAA/GDPR compliance equivalent)
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'ACCESS_VIEW', 'PRESCRIPTION_SIGN', 'STOCK_TRANSACTION'
    resource_type TEXT NOT NULL, -- 'medical_dossier', 'prescription', 'order', 'stock', 'role_change'
    resource_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(performed_at DESC);

-- 2. HELPER FUNCTION TO RECORD AUDIT TRAIL SAFELY
CREATE OR REPLACE FUNCTION record_audit_log(
    p_actor_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        performed_at
    )
    VALUES (
        COALESCE(p_actor_id, auth.uid()),
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        p_ip,
        p_user_agent,
        now()
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
