CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" varchar NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "rewards" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "points_conversion_real" numeric(10, 2) DEFAULT '1.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;