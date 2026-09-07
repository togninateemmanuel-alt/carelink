-- ============================================================================
-- Migration: 20260907000007_marketplace_orders.sql
-- Description: Multi-pharmacy shopping carts, parent orders & partitioned fulfillments
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. SHOPPING CARTS (Panier du patient)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. CART ITEMS (Lignes du panier)
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_pharmacy ON cart_items(pharmacy_id);

CREATE TRIGGER trg_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. ORDERS (Commande mère globale du patient)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE,
    status order_status_type NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    insurance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    patient_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'XOF',
    payment_status payment_status_type NOT NULL DEFAULT 'pending',
    delivery_mode delivery_mode_type NOT NULL DEFAULT 'pickup',
    delivery_address TEXT,
    delivery_city TEXT,
    delivery_latitude NUMERIC(10, 7),
    delivery_longitude NUMERIC(10, 7),
    patient_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. ORDER FULFILLMENTS (Sous-commandes spécifiques à chaque pharmacie)
CREATE TABLE IF NOT EXISTS order_fulfillments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    fulfillment_number TEXT NOT NULL UNIQUE,
    subtotal_amount NUMERIC(12, 2) NOT NULL,
    status fulfillment_status_type NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    prepared_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_order ON order_fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_pharmacy ON order_fulfillments(pharmacy_id, status);

CREATE TRIGGER trg_order_fulfillments_updated_at
BEFORE UPDATE ON order_fulfillments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. ORDER ITEMS (Articles détaillés attachés au fulfillment)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_fulfillment_id UUID NOT NULL REFERENCES order_fulfillments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_order_item_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment ON order_items(order_fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Auto-generate readable unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION generate_order_number();
