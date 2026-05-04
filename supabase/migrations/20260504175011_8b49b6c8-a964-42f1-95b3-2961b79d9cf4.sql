-- Soft-delete duplicates with no references (keep oldest 92ba2f29...)
UPDATE public.external_companies
SET deleted_at = now(), updated_at = now()
WHERE id IN ('dfaef7c2-a275-4684-8ae0-ca5a9a5e30da','ecc993db-7dab-44d0-b017-6d2db692a282');

-- Prevent future duplicates: unique on normalized document among non-deleted
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_companies_document_unique_active
ON public.external_companies (document)
WHERE deleted_at IS NULL AND document IS NOT NULL;