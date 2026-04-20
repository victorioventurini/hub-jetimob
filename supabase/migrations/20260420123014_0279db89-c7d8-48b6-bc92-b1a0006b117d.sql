-- Adiciona valor 'cancelled' ao enum initiative_status para permitir
-- a cascata de cancelamento (trigger cascade_kr_cancellation) funcionar.
ALTER TYPE public.initiative_status ADD VALUE IF NOT EXISTS 'cancelled';