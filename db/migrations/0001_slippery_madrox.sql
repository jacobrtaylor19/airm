CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text,
	"messages" text NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" text,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "demo_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"role" text,
	"created_at" text NOT NULL,
	"source" text DEFAULT 'demo_overview'
);
--> statement-breakpoint
CREATE TABLE "evidence_package_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"release_id" integer,
	"generated_by_user_id" integer NOT NULL,
	"generated_by_username" text NOT NULL,
	"framework" text DEFAULT 'sox_404' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"persona_count" integer DEFAULT 0 NOT NULL,
	"assignment_count" integer DEFAULT 0 NOT NULL,
	"sod_conflict_count" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"enabled_for_roles" text,
	"enabled_for_users" text,
	"percentage" integer,
	"metadata" text,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "feature_flags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"source" text NOT NULL,
	"source_ref" text,
	"ai_classification" text,
	"ai_triaged_at" text,
	"resolution" text,
	"resolved_by" integer,
	"resolved_at" text,
	"affected_component" text,
	"affected_users" integer,
	"metadata" text,
	"organization_id" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mapping_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"persona_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"accepted" boolean NOT NULL,
	"ai_confidence" integer,
	"ai_reasoning" text,
	"created_by" integer,
	"organization_id" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"settings" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" text NOT NULL,
	"window_end" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"export_type" text NOT NULL,
	"schedule" text NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"hour" integer DEFAULT 6 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" text,
	"last_run_status" text,
	"last_run_error" text,
	"next_run_at" text,
	"created_by" integer NOT NULL,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "security_work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sod_conflict_id" integer NOT NULL,
	"target_role_id" integer NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"assigned_to_user_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"compliance_notes" text,
	"security_notes" text,
	"completed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sso_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_name" text,
	"domain" text,
	"metadata_url" text,
	"metadata_xml" text,
	"supabase_sso_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_user_id" integer NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" text NOT NULL,
	"accepted_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"http_status" integer,
	"response_body" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_retry_at" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"secret" text NOT NULL,
	"events" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_failure_at" text,
	"last_success_at" text,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "workstream_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"release_id" integer,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"owner" text,
	"proposed_by" integer,
	"proposed_by_name" text,
	"approved_by" integer,
	"approved_by_name" text,
	"resolved_at" text,
	"resolution_notes" text,
	"due_date" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ALTER COLUMN "password_hash" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "security_design_changes" ALTER COLUMN "target_role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "supabase_auth_id" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "tos_accepted_at" text;--> statement-breakpoint
ALTER TABLE "app_users" ADD COLUMN "tos_version" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "consolidated_groups" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "org_units" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "release_org_units" ADD COLUMN "source_system_type_override" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "default_source_system_type" text DEFAULT 'SAP_ECC';--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "target_system_type" text DEFAULT 'SAP_S4HANA';--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "mapping_deadline" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "review_deadline" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "approval_deadline" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "cutover_date" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "go_live_date" text;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "role_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "role_external_id" text;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "detail" text NOT NULL;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "reviewed_at" text;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD COLUMN "mitigating_control" text;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD COLUMN "control_owner" text;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD COLUMN "control_frequency" text;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD COLUMN "control_last_reviewed_at" text;--> statement-breakpoint
ALTER TABLE "sod_conflicts" ADD COLUMN "involved_existing_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sod_rules" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "source_roles" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "source" text DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "approved_at" text;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "updated_at" text;--> statement-breakpoint
ALTER TABLE "target_roles" ADD COLUMN "updated_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_by_app_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_feedback" ADD CONSTRAINT "mapping_feedback_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_feedback" ADD CONSTRAINT "mapping_feedback_target_role_id_target_roles_id_fk" FOREIGN KEY ("target_role_id") REFERENCES "public"."target_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_feedback" ADD CONSTRAINT "mapping_feedback_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mapping_feedback" ADD CONSTRAINT "mapping_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_configurations" ADD CONSTRAINT "sso_configurations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD CONSTRAINT "security_design_changes_reviewed_by_app_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_design_changes" ADD CONSTRAINT "security_design_changes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_supabase_auth_id_unique" UNIQUE("supabase_auth_id");