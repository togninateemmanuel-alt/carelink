-- ============================================================================
-- Migration: 20260907000006_pharmacy_and_inventory.sql
-- Description: Product catalog, categories, real-time stock & audited stock movements
-- Project: CareLink Healthcare Platform
-- ============================================================================

-- 1. PRODUCT CATEGORIES (Taxonomie pharmaceutique)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON product_categories(parent_id);

-- 2. PRODUCTS (Articles vendus par chaque officine)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand TEXT,
    generic_name TEXT, -- DCI (Dénomination Commune Internationale)
    form TEXT NOT NULL, -- Comprimé, Sirop, Gélule, Pommade, Solution injectable
    dosage TEXT NOT NULL, -- 500 mg, 1 g, 10 mg/ml
    description TEXT,
    price NUMERIC(12, 2) NOT NULL, -- En FCFA
    currency TEXT NOT NULL DEFAULT 'XOF',
    is_prescription_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sku TEXT,
    barcode TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_product_price CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_pharmacy ON products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_generic ON products(generic_name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. PRODUCT STOCKS (Niveau actuel de stock)
CREATE TABLE IF NOT EXISTS product_stocks (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_stock_non_negative CHECK (current_quantity >= 0),
    CONSTRAINT chk_reserved_non_negative CHECK (reserved_quantity >= 0),
    CONSTRAINT chk_reserved_lte_current CHECK (reserved_quantity <= current_quantity)
);

CREATE INDEX IF NOT EXISTS idx_stocks_pharmacy ON product_stocks(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_stocks_quantity ON product_stocks(current_quantity);

CREATE TRIGGER trg_product_stocks_updated_at
BEFORE UPDATE ON product_stocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-initialize product_stocks row on product creation
CREATE OR REPLACE FUNCTION handle_product_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.product_stocks (product_id, pharmacy_id, current_quantity, reserved_quantity)
    VALUES (NEW.id, NEW.pharmacy_id, 0, 0)
    ON CONFLICT (product_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_product_created
AFTER INSERT ON products
FOR EACH ROW EXECUTE FUNCTION handle_product_created();

-- 4. STOCK MOVEMENTS (Grand livre immuable des flux de stock)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    movement_type stock_movement_type NOT NULL,
    quantity_change INTEGER NOT NULL, -- Ex: +50 (réception), -2 (vente), -1 (perte)
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type TEXT NOT NULL, -- 'order', 'manual_adjustment', 'initial_stock', 'inventory_audit', 'prescription_dispense'
    reference_id TEXT,
    notes TEXT,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_pharmacy ON stock_movements(pharmacy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
