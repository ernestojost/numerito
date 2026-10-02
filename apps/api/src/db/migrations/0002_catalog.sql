CREATE TYPE "public"."override_kind" AS ENUM('blocked', 'extra_open');--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "business_hours_weekday" CHECK ("business_hours"."weekday" between 0 and 6),
	CONSTRAINT "business_hours_range" CHECK ("business_hours"."opens_at" < "business_hours"."closes_at")
);
--> statement-breakpoint
CREATE TABLE "schedule_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"staff_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"kind" "override_kind" DEFAULT 'blocked' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_overrides_range" CHECK ("schedule_overrides"."starts_at" < "schedule_overrides"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"buffer_minutes" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"deposit_cents" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration_positive" CHECK ("services"."duration_minutes" > 0),
	CONSTRAINT "services_money_non_negative" CHECK ("services"."price_cents" >= 0 and coalesce("services"."deposit_cents", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"email" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	CONSTRAINT "staff_schedules_weekday" CHECK ("staff_schedules"."weekday" between 0 and 6),
	CONSTRAINT "staff_schedules_range" CHECK ("staff_schedules"."starts_at" < "staff_schedules"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "staff_services" (
	"staff_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "staff_services_staff_id_service_id_pk" PRIMARY KEY("staff_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_overrides" ADD CONSTRAINT "schedule_overrides_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_hours_business_idx" ON "business_hours" USING btree ("business_id","weekday");--> statement-breakpoint
CREATE INDEX "schedule_overrides_business_idx" ON "schedule_overrides" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "services_business_idx" ON "services" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_business_idx" ON "staff" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_schedules_staff_idx" ON "staff_schedules" USING btree ("staff_id","weekday");