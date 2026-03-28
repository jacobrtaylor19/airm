CREATE TABLE "app_user_releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_user_id" integer NOT NULL,
	"release_id" integer NOT NULL,
	"assigned_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"app_user_id" integer NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "app_user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"assigned_org_unit_id" integer,
	"is_active" boolean DEFAULT true,
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" integer,
	"demo_environment" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "app_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"actor_email" text,
	"ip_address" text,
	"metadata" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consolidated_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"access_level" text,
	"domain" text,
	"sort_order" integer,
	"created_at" text NOT NULL,
	CONSTRAINT "consolidated_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "least_access_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"excess_percent" real,
	"justification" text NOT NULL,
	"accepted_by" text NOT NULL,
	"accepted_at" text NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"revoked_by" text,
	"revoked_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"notification_type" text DEFAULT 'reminder' NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" integer,
	"action_url" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"read_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"parent_id" integer,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "permission_gaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" integer NOT NULL,
	"source_permission_id" integer NOT NULL,
	"gap_type" text DEFAULT 'no_coverage' NOT NULL,
	"notes" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_unit_id" integer NOT NULL,
	"confirmed_at" text,
	"confirmed_by" integer,
	"reset_at" text,
	"reset_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_source_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" integer NOT NULL,
	"source_permission_id" integer NOT NULL,
	"weight" real DEFAULT 1,
	"is_required" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "persona_target_role_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"mapping_reason" text,
	"coverage_percent" real,
	"excess_percent" real,
	"confidence" text,
	"is_active" boolean DEFAULT true,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"business_function" text,
	"consolidated_group_id" integer,
	"source" text DEFAULT 'ai' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "personas_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_records" integer DEFAULT 0,
	"processed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"config" text,
	"error_log" text,
	"started_at" text,
	"completed_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_org_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"org_unit_id" integer NOT NULL,
	"added_at" text NOT NULL,
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE "release_sod_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"sod_rule_id" integer NOT NULL,
	"added_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_source_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"source_role_id" integer NOT NULL,
	"added_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_target_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"added_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"release_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"added_at" text NOT NULL,
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"release_type" text DEFAULT 'initial' NOT NULL,
	"target_system" text,
	"target_date" text,
	"completed_date" text,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_by" integer NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "review_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "security_design_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_role_id" integer NOT NULL,
	"change_type" text NOT NULL,
	"change_description" text,
	"detected_at" text NOT NULL,
	"detected_by" text,
	"affected_mapping_count" integer DEFAULT 0,
	"acknowledged_by" text,
	"acknowledged_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sod_conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sod_rule_id" integer NOT NULL,
	"role_id_a" integer,
	"role_id_b" integer,
	"permission_id_a" text,
	"permission_id_b" text,
	"severity" text NOT NULL,
	"conflict_type" text DEFAULT 'between_role' NOT NULL,
	"resolution_status" text DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" text,
	"resolution_notes" text,
	"risk_explanation" text,
	"analysis_job_id" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sod_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"description" text,
	"permission_a" text NOT NULL,
	"permission_b" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"risk_description" text,
	"is_active" boolean DEFAULT true,
	"created_at" text NOT NULL,
	CONSTRAINT "sod_rules_rule_id_unique" UNIQUE("rule_id")
);
--> statement-breakpoint
CREATE TABLE "source_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"permission_id" text NOT NULL,
	"permission_name" text,
	"description" text,
	"system" text DEFAULT 'SAP ECC',
	"permission_type" text,
	"risk_level" text,
	CONSTRAINT "source_permissions_permission_id_unique" UNIQUE("permission_id")
);
--> statement-breakpoint
CREATE TABLE "source_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_role_id" integer NOT NULL,
	"source_permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text NOT NULL,
	"description" text,
	"system" text DEFAULT 'SAP ECC',
	"domain" text,
	"role_type" text,
	"role_owner" text,
	"created_at" text NOT NULL,
	CONSTRAINT "source_roles_role_id_unique" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" text NOT NULL,
	"updated_by" text,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "target_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"permission_id" text NOT NULL,
	"permission_name" text,
	"description" text,
	"system" text DEFAULT 'S/4HANA',
	"permission_type" text,
	"risk_level" text,
	CONSTRAINT "target_permissions_permission_id_unique" UNIQUE("permission_id")
);
--> statement-breakpoint
CREATE TABLE "target_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_role_id" integer NOT NULL,
	"target_permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"role_name" text NOT NULL,
	"description" text,
	"system" text DEFAULT 'S/4HANA',
	"domain" text,
	"capabilities" text,
	"role_owner" text,
	"created_at" text NOT NULL,
	CONSTRAINT "target_roles_role_id_unique" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE "target_security_role_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_role_id" integer NOT NULL,
	"target_task_role_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_task_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_task_role_id" integer NOT NULL,
	"target_permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_task_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_role_id" text NOT NULL,
	"task_role_name" text NOT NULL,
	"description" text,
	"system" text DEFAULT 'S/4HANA',
	"domain" text,
	"created_at" text NOT NULL,
	CONSTRAINT "target_task_roles_task_role_id_unique" UNIQUE("task_role_id")
);
--> statement-breakpoint
CREATE TABLE "user_persona_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"persona_id" integer,
	"consolidated_group_id" integer,
	"confidence_score" real,
	"ai_reasoning" text,
	"ai_model" text,
	"assignment_method" text,
	"job_run_id" integer,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_source_role_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_role_id" integer NOT NULL,
	"assigned_date" text
);
--> statement-breakpoint
CREATE TABLE "user_target_role_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"release_id" integer,
	"derived_from_persona_id" integer,
	"assignment_type" text DEFAULT 'persona_default' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"release_phase" text DEFAULT 'current' NOT NULL,
	"sod_conflict_count" integer DEFAULT 0,
	"risk_accepted_by" text,
	"risk_accepted_at" text,
	"risk_justification" text,
	"approved_by" text,
	"approved_at" text,
	"sent_back_reason" text,
	"mapped_by" text,
	"persona_mapping_changed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"department" text,
	"job_title" text,
	"org_unit" text,
	"org_unit_id" integer,
	"cost_center" text,
	"user_type" text DEFAULT 'standard',
	"metadata" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "users_source_user_id_unique" UNIQUE("source_user_id")
);
--> statement-breakpoint
CREATE TABLE "work_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_user_id" integer NOT NULL,
	"assignment_type" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_value" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_user_releases" ADD CONSTRAINT "app_user_releases_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_releases" ADD CONSTRAINT "app_user_releases_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_sessions" ADD CONSTRAINT "app_user_sessions_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "least_access_exceptions" ADD CONSTRAINT "least_access_exceptions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "least_access_exceptions" ADD CONSTRAINT "least_access_exceptions_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_from_user_id_app_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_to_user_id_app_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_gaps" ADD CONSTRAINT "permission_gaps_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_gaps" ADD CONSTRAINT "permission_gaps_source_permission_id_source_permissions_id_fk" FOREIGN KEY ("source_permission_id") REFERENCES "public"."source_permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_confirmations" ADD CONSTRAINT "persona_confirmations_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_confirmations" ADD CONSTRAINT "persona_confirmations_confirmed_by_app_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_confirmations" ADD CONSTRAINT "persona_confirmations_reset_by_app_users_id_fk" FOREIGN KEY ("reset_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_source_permissions" ADD CONSTRAINT "persona_source_permissions_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_source_permissions" ADD CONSTRAINT "persona_source_permissions_source_permission_id_source_permissions_id_fk" FOREIGN KEY ("source_permission_id") REFERENCES "public"."source_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_target_role_mappings" ADD CONSTRAINT "persona_target_role_mappings_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_target_role_mappings" ADD CONSTRAINT "persona_target_role_mappings_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_consolidated_group_id_consolidated_groups_id_fk" FOREIGN KEY ("consolidated_group_id") REFERENCES "public"."consolidated_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_org_units" ADD CONSTRAINT "release_org_units_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_org_units" ADD CONSTRAINT "release_org_units_org_unit_id_org_units_id_fk" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_sod_rules" ADD CONSTRAINT "release_sod_rules_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_sod_rules" ADD CONSTRAINT "release_sod_rules_sod_rule_id_sod_rules_id_fk" FOREIGN KEY ("sod_rule_id") REFERENCES "public"."sod_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_source_roles" ADD CONSTRAINT "release_source_roles_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_source_roles" ADD CONSTRAINT "release_source_roles_source_role_id_source_roles_id_fk" FOREIGN KEY ("source_role_id") REFERENCES "public"."source_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_target_roles" ADD CONSTRAINT "release_target_roles_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_target_roles" ADD CONSTRAINT "release_target_roles_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_users" ADD CONSTRAINT "release_users_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_users" ADD CONSTRAINT "release_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_links" ADD CONSTRAINT "review_links_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD CONSTRAINT "security_design_changes_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD CONSTRAINT "sod_conflicts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD CONSTRAINT "sod_conflicts_sod_rule_id_sod_rules_id_fk" FOREIGN KEY ("sod_rule_id") REFERENCES "public"."sod_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD CONSTRAINT "sod_conflicts_role_id_a_target_roles_id_fk" FOREIGN KEY ("role_id_a") REFERENCES "public"."target_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD CONSTRAINT "sod_conflicts_role_id_b_target_roles_id_fk" FOREIGN KEY ("role_id_b") REFERENCES "public"."target_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD CONSTRAINT "sod_conflicts_analysis_job_id_processing_jobs_id_fk" FOREIGN KEY ("analysis_job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_role_permissions" ADD CONSTRAINT "source_role_permissions_source_role_id_source_roles_id_fk" FOREIGN KEY ("source_role_id") REFERENCES "public"."source_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_role_permissions" ADD CONSTRAINT "source_role_permissions_source_permission_id_source_permissions_id_fk" FOREIGN KEY ("source_permission_id") REFERENCES "public"."source_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_role_permissions" ADD CONSTRAINT "target_role_permissions_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_role_permissions" ADD CONSTRAINT "target_role_permissions_target_permission_id_target_permissions_id_fk" FOREIGN KEY ("target_permission_id") REFERENCES "public"."target_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_security_role_tasks" ADD CONSTRAINT "target_security_role_tasks_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_security_role_tasks" ADD CONSTRAINT "target_security_role_tasks_target_task_role_id_target_task_roles_id_fk" FOREIGN KEY ("target_task_role_id") REFERENCES "public"."target_task_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_task_role_permissions" ADD CONSTRAINT "target_task_role_permissions_target_task_role_id_target_task_roles_id_fk" FOREIGN KEY ("target_task_role_id") REFERENCES "public"."target_task_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_task_role_permissions" ADD CONSTRAINT "target_task_role_permissions_target_permission_id_target_permissions_id_fk" FOREIGN KEY ("target_permission_id") REFERENCES "public"."target_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_persona_assignments" ADD CONSTRAINT "user_persona_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_persona_assignments" ADD CONSTRAINT "user_persona_assignments_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_persona_assignments" ADD CONSTRAINT "user_persona_assignments_consolidated_group_id_consolidated_groups_id_fk" FOREIGN KEY ("consolidated_group_id") REFERENCES "public"."consolidated_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_persona_assignments" ADD CONSTRAINT "user_persona_assignments_job_run_id_processing_jobs_id_fk" FOREIGN KEY ("job_run_id") REFERENCES "public"."processing_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_source_role_assignments" ADD CONSTRAINT "user_source_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_source_role_assignments" ADD CONSTRAINT "user_source_role_assignments_source_role_id_source_roles_id_fk" FOREIGN KEY ("source_role_id") REFERENCES "public"."source_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_target_role_assignments" ADD CONSTRAINT "user_target_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_target_role_assignments" ADD CONSTRAINT "user_target_role_assignments_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_target_role_assignments" ADD CONSTRAINT "user_target_role_assignments_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_target_role_assignments" ADD CONSTRAINT "user_target_role_assignments_derived_from_persona_id_personas_id_fk" FOREIGN KEY ("derived_from_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;