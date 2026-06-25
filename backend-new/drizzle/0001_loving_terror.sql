ALTER TABLE "consumer_profiles" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "consumer_profiles" ADD COLUMN "phone" varchar;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_unique" UNIQUE("slug");