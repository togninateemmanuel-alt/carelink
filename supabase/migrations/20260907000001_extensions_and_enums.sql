-- ============================================================================
-- Migration: 20260907000001_extensions_and_enums.sql
-- Description: Core PostgreSQL extensions and domain-specific ENUM definitions
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CORE ROLES & PERMISSIONS
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM (
        'patient',
        'doctor',
        'pharmacy_admin',
        'pharmacy_staff',
        'platform_admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. MEDICAL & BIOLOGICAL ENUMS
DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM (
        'male',
        'female',
        'other',
        'unspecified'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blood_group_type AS ENUM (
        'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE doctor_verification_status AS ENUM (
        'pending',
        'verified',
        'rejected',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. ACCESS CONTROL ENUMS (MEDICAL RECORD)
DO $$ BEGIN
    CREATE TYPE access_level_type AS ENUM (
        'read_only',
        'read_write',
        'full'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE access_status_type AS ENUM (
        'active',
        'revoked',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. SLOTS, APPOINTMENTS & CONSULTATIONS
DO $$ BEGIN
    CREATE TYPE slot_status_type AS ENUM (
        'available',
        'booked',
        'blocked',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_mode_type AS ENUM (
        'in_person',
        'teleconsultation',
        'home_visit'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status_type AS ENUM (
        'requested',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'transferred'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_status_type AS ENUM (
        'draft',
        'in_progress',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. PRESCRIPTIONS & PHARMACY TRANSFERS
DO $$ BEGIN
    CREATE TYPE prescription_status_type AS ENUM (
        'active',
        'partially_dispensed',
        'dispensed',
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status_type AS ENUM (
        'pending',
        'accepted',
        'rejected',
        'dispensing',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. STOCK & INVENTORY
DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM (
        'entry',
        'sale',
        'adjustment',
        'reservation',
        'release_reservation',
        'return',
        'loss',
        'expiry'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. ORDERS & FULFILLMENT (MARKETPLACE)
DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'pending',
        'confirmed',
        'processing',
        'partially_fulfilled',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fulfillment_status_type AS ENUM (
        'pending',
        'accepted',
        'preparing',
        'ready_for_pickup',
        'completed',
        'rejected',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_mode_type AS ENUM (
        'pickup',
        'standard_delivery',
        'express_delivery'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 9. PAYMENTS & INSURANCE CLAIMS
DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM (
        'tmoney',
        'yas',
        'moov_money',
        'gozem',
        'card',
        'paypal',
        'cash_on_delivery',
        'cash_in_person'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'pending',
        'processing',
        'succeeded',
        'failed',
        'cancelled',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE claim_status_type AS ENUM (
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'paid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. NOTIFICATIONS
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'appointment',
        'prescription',
        'order',
        'stock',
        'access_request',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
