-- ============================================================================
-- Migration: 20260907000009_payments_and_notifications.sql
-- Description: Financial payment audit (no sensitive card storage) & real-time notification engine
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. PAYMENTS (Audit financier sans stockage de numéros de carte bancaire)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_method payment_method_type NOT NULL,
    status payment_status_type NOT NULL DEFAULT 'pending',
    provider_tx_id TEXT, -- ID de transaction de la passerelle (T-Money, Moov Money, Gozem, etc.)
    external_reference TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_payment_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(external_reference);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. NOTIFICATIONS (Moteur de notifications push & in-app)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type NOT NULL DEFAULT 'system',
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Action deep-link, IDs d'objets, etc.
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- Trigger: When order status changes, auto-notify patient
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.notifications (recipient_id, title, message, notification_type, data)
        VALUES (
            NEW.patient_id,
            'Statut de votre commande',
            'Votre commande ' || NEW.order_number || ' est maintenant : ' || NEW.status::TEXT,
            'order',
            jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_notify_patient
AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();
