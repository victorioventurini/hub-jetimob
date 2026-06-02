UPDATE public.ritual_window_overrides
SET opens_date = '2026-06-02', closes_date = '2026-06-02',
    reason = 'Ajuste pontual: MBR de maio/2026 movido para ter 02/jun (sync com reagendamento)',
    updated_at = now()
WHERE id = 'acb3f1ef-4c4f-4b86-b16b-1681098d2507';