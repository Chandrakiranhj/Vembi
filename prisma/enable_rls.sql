-- Enable RLS and create policies for all tables

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "User";
CREATE POLICY "Enable all for authenticated users" ON "User" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Vendor
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Vendor";
CREATE POLICY "Enable all for authenticated users" ON "Vendor" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Component
ALTER TABLE "Component" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Component";
CREATE POLICY "Enable all for authenticated users" ON "Component" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- stock_batches
ALTER TABLE "stock_batches" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "stock_batches";
CREATE POLICY "Enable all for authenticated users" ON "stock_batches" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Product
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Product";
CREATE POLICY "Enable all for authenticated users" ON "Product" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Assembly
ALTER TABLE "Assembly" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Assembly";
CREATE POLICY "Enable all for authenticated users" ON "Assembly" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- assembly_component_batches
ALTER TABLE "assembly_component_batches" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "assembly_component_batches";
CREATE POLICY "Enable all for authenticated users" ON "assembly_component_batches" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Return
ALTER TABLE "Return" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Return";
CREATE POLICY "Enable all for authenticated users" ON "Return" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ReturnComponent
ALTER TABLE "ReturnComponent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "ReturnComponent";
CREATE POLICY "Enable all for authenticated users" ON "ReturnComponent" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Defect
ALTER TABLE "Defect" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Defect";
CREATE POLICY "Enable all for authenticated users" ON "Defect" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- product_components
ALTER TABLE "product_components" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "product_components";
CREATE POLICY "Enable all for authenticated users" ON "product_components" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ReturnQC
ALTER TABLE "ReturnQC" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "ReturnQC";
CREATE POLICY "Enable all for authenticated users" ON "ReturnQC" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ReturnQCDefect
ALTER TABLE "ReturnQCDefect" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "ReturnQCDefect";
CREATE POLICY "Enable all for authenticated users" ON "ReturnQCDefect" FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
