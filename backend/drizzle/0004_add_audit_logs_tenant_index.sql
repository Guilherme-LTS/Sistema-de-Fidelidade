CREATE TABLE "stripe_invoices" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"pdf_url" text,
	"receipt_url" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "consent_ip" varchar(45);--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "consent_user_agent" text;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "consent_operator_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "regulation_notes" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_subscription_last_event_at" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_billing_cached_details" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "stripe_billing_last_synced_at" integer;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_status" varchar(50) DEFAULT 'trialing';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_price_id" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_current_period_end" timestamp with time zone DEFAULT (now() + interval '14 days');--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "trial_onboarding_shown" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_invoices" ADD CONSTRAINT "stripe_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant_created" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_created" ON "customers" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_expirations_tenant_created" ON "expirations" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_redemptions_tenant_created" ON "redemptions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_created" ON "transactions" USING btree ("tenant_id","created_at");--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id");