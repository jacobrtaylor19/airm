-- Migration: rls_deny_all_missing_29_tables
-- Date: 2026-04-01
-- Purpose: Add deny-all RLS policies to 29 tables that had RLS enabled but no policies.
--          Consistent with 2026-04-01 security lockdown pattern.
--          All data access goes through service_role (server-side API routes), which bypasses RLS.
--          anon and authenticated roles are explicitly blocked on all tables.

-- app_user_releases
CREATE POLICY "deny_all_anon" ON public.app_user_releases
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.app_user_releases
  FOR ALL TO authenticated USING (false);

-- app_user_sessions
CREATE POLICY "deny_all_anon" ON public.app_user_sessions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.app_user_sessions
  FOR ALL TO authenticated USING (false);

-- consolidated_groups
CREATE POLICY "deny_all_anon" ON public.consolidated_groups
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.consolidated_groups
  FOR ALL TO authenticated USING (false);

-- leads
CREATE POLICY "deny_all_anon" ON public.leads
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.leads
  FOR ALL TO authenticated USING (false);

-- least_access_exceptions
CREATE POLICY "deny_all_anon" ON public.least_access_exceptions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.least_access_exceptions
  FOR ALL TO authenticated USING (false);

-- org_units
CREATE POLICY "deny_all_anon" ON public.org_units
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.org_units
  FOR ALL TO authenticated USING (false);

-- permission_gaps
CREATE POLICY "deny_all_anon" ON public.permission_gaps
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.permission_gaps
  FOR ALL TO authenticated USING (false);

-- persona_confirmations
CREATE POLICY "deny_all_anon" ON public.persona_confirmations
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.persona_confirmations
  FOR ALL TO authenticated USING (false);

-- persona_source_permissions
CREATE POLICY "deny_all_anon" ON public.persona_source_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.persona_source_permissions
  FOR ALL TO authenticated USING (false);

-- persona_target_role_mappings
CREATE POLICY "deny_all_anon" ON public.persona_target_role_mappings
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.persona_target_role_mappings
  FOR ALL TO authenticated USING (false);

-- release_org_units
CREATE POLICY "deny_all_anon" ON public.release_org_units
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.release_org_units
  FOR ALL TO authenticated USING (false);

-- release_sod_rules
CREATE POLICY "deny_all_anon" ON public.release_sod_rules
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.release_sod_rules
  FOR ALL TO authenticated USING (false);

-- release_source_roles
CREATE POLICY "deny_all_anon" ON public.release_source_roles
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.release_source_roles
  FOR ALL TO authenticated USING (false);

-- release_target_roles
CREATE POLICY "deny_all_anon" ON public.release_target_roles
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.release_target_roles
  FOR ALL TO authenticated USING (false);

-- release_users
CREATE POLICY "deny_all_anon" ON public.release_users
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.release_users
  FOR ALL TO authenticated USING (false);

-- security_design_changes
CREATE POLICY "deny_all_anon" ON public.security_design_changes
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.security_design_changes
  FOR ALL TO authenticated USING (false);

-- source_permissions
CREATE POLICY "deny_all_anon" ON public.source_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.source_permissions
  FOR ALL TO authenticated USING (false);

-- source_role_permissions
CREATE POLICY "deny_all_anon" ON public.source_role_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.source_role_permissions
  FOR ALL TO authenticated USING (false);

-- source_roles
CREATE POLICY "deny_all_anon" ON public.source_roles
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.source_roles
  FOR ALL TO authenticated USING (false);

-- target_permissions
CREATE POLICY "deny_all_anon" ON public.target_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_permissions
  FOR ALL TO authenticated USING (false);

-- target_role_permissions
CREATE POLICY "deny_all_anon" ON public.target_role_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_role_permissions
  FOR ALL TO authenticated USING (false);

-- target_roles
CREATE POLICY "deny_all_anon" ON public.target_roles
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_roles
  FOR ALL TO authenticated USING (false);

-- target_security_role_tasks
CREATE POLICY "deny_all_anon" ON public.target_security_role_tasks
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_security_role_tasks
  FOR ALL TO authenticated USING (false);

-- target_task_role_permissions
CREATE POLICY "deny_all_anon" ON public.target_task_role_permissions
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_task_role_permissions
  FOR ALL TO authenticated USING (false);

-- target_task_roles
CREATE POLICY "deny_all_anon" ON public.target_task_roles
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.target_task_roles
  FOR ALL TO authenticated USING (false);

-- user_persona_assignments
CREATE POLICY "deny_all_anon" ON public.user_persona_assignments
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.user_persona_assignments
  FOR ALL TO authenticated USING (false);

-- user_source_role_assignments
CREATE POLICY "deny_all_anon" ON public.user_source_role_assignments
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.user_source_role_assignments
  FOR ALL TO authenticated USING (false);

-- user_target_role_assignments
CREATE POLICY "deny_all_anon" ON public.user_target_role_assignments
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.user_target_role_assignments
  FOR ALL TO authenticated USING (false);

-- work_assignments
CREATE POLICY "deny_all_anon" ON public.work_assignments
  FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON public.work_assignments
  FOR ALL TO authenticated USING (false);
