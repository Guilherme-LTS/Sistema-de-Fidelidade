CREATE TABLE "expiration_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"expiration_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"points_deducted" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expirations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"tenant_id" uuid NOT NULL,
	"points_expired" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "business_hours" jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "expiration_items" ADD CONSTRAINT "expiration_items_expiration_id_expirations_id_fk" FOREIGN KEY ("expiration_id") REFERENCES "public"."expirations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expiration_items" ADD CONSTRAINT "expiration_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expirations" ADD CONSTRAINT "expirations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expirations" ADD CONSTRAINT "expirations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;