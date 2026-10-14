ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS commission_base_amount numeric,
  ADD COLUMN IF NOT EXISTS related_movement_id uuid
    REFERENCES public.movements(id)
    ON DELETE CASCADE;
