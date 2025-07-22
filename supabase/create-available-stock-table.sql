-- Create available_stock table for cumulative stock tracking
CREATE TABLE IF NOT EXISTS public.available_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bread_type_id uuid NOT NULL REFERENCES public.bread_types(id) ON DELETE CASCADE,
  bread_type_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(bread_type_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_available_stock_bread_type ON public.available_stock(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_available_stock_quantity ON public.available_stock(quantity);

-- Create function to update available stock based on production and sales
CREATE OR REPLACE FUNCTION update_available_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle production insert/update
  IF TG_TABLE_NAME = 'production_logs' THEN
    INSERT INTO public.available_stock (bread_type_id, bread_type_name, quantity, unit_price)
    VALUES (NEW.bread_type_id, (SELECT name FROM public.bread_types WHERE id = NEW.bread_type_id), NEW.quantity, NEW.unit_price)
    ON CONFLICT (bread_type_id) 
    DO UPDATE SET 
      quantity = available_stock.quantity + NEW.quantity,
      unit_price = NEW.unit_price,
      last_updated = now(),
      updated_at = now();
  
  -- Handle sales insert/update
  ELSIF TG_TABLE_NAME = 'sales_logs' THEN
    UPDATE public.available_stock 
    SET 
      quantity = GREATEST(0, available_stock.quantity - NEW.quantity),
      last_updated = now(),
      updated_at = now()
    WHERE bread_type_id = NEW.bread_type_id;
  
  -- Handle sales delete (restore quantity)
  ELSIF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'sales_logs' THEN
    UPDATE public.available_stock 
    SET 
      quantity = available_stock.quantity + OLD.quantity,
      last_updated = now(),
      updated_at = now()
    WHERE bread_type_id = OLD.bread_type_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic stock updates
DROP TRIGGER IF EXISTS update_stock_on_production ON public.production_logs;
CREATE TRIGGER update_stock_on_production
  AFTER INSERT OR UPDATE ON public.production_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_available_stock();

DROP TRIGGER IF EXISTS update_stock_on_sales ON public.sales_logs;
CREATE TRIGGER update_stock_on_sales
  AFTER INSERT OR UPDATE ON public.sales_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_available_stock();

DROP TRIGGER IF EXISTS restore_stock_on_sales_delete ON public.sales_logs;
CREATE TRIGGER restore_stock_on_sales_delete
  AFTER DELETE ON public.sales_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_available_stock();

-- Create RLS policies for available_stock
ALTER TABLE public.available_stock ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read access to all authenticated users" ON public.available_stock
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow managers and owners to update
CREATE POLICY "Allow managers and owners to update stock" ON public.available_stock
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Allow managers and owners to insert
CREATE POLICY "Allow managers and owners to insert stock" ON public.available_stock
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Initial population of available_stock from existing data
INSERT INTO public.available_stock (bread_type_id, bread_type_name, quantity, unit_price)
SELECT 
  bt.id,
  bt.name,
  COALESCE(SUM(pl.quantity), 0) - COALESCE(SUM(sl.quantity), 0) as total_quantity,
  bt.unit_price
FROM public.bread_types bt
LEFT JOIN public.production_logs pl ON bt.id = pl.bread_type_id
LEFT JOIN public.sales_logs sl ON bt.id = sl.bread_type_id
GROUP BY bt.id, bt.name, bt.unit_price
ON CONFLICT (bread_type_id) 
DO UPDATE SET 
  quantity = EXCLUDED.quantity,
  unit_price = EXCLUDED.unit_price,
  last_updated = now(),
  updated_at = now();
