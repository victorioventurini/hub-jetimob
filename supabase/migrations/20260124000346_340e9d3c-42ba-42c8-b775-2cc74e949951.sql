
-- =====================================================
-- Security Fix: Tighten INSERT policies for logging tables
-- Migration: Fix overly permissive INSERT policies
-- =====================================================

-- 1. Fix app_error_logs - Tighten INSERT policy
-- Still allows authenticated users to insert, but now with proper user_id binding
DROP POLICY IF EXISTS "app_error_logs_insert_v1" ON public.app_error_logs;

CREATE POLICY "app_error_logs_insert_v2"
  ON public.app_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only insert logs with their own user_id (or NULL for anonymous context)
    user_id IS NULL OR user_id = auth.uid()
  );

-- 2. Fix audit_logs - Tighten INSERT policy
-- Keep allowing inserts before BU context but require authentication and self-referential user_id
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_authenticated_v2"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only insert logs with their own user_id (or NULL for system events)
    user_id IS NULL OR user_id = auth.uid()
  );

-- Note: These policies still allow authenticated users to insert logs
-- but now enforce that they can only attribute logs to themselves,
-- preventing impersonation in audit trails while maintaining functionality
-- for pre-BU context scenarios.
