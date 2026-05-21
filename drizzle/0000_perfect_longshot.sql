CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"release_id" bigint NOT NULL,
	"channel_id" text NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_release_id_channel_id_unique" UNIQUE("release_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"repository_id" bigint NOT NULL,
	"forge_release_id" text NOT NULL,
	"tag_name" text NOT NULL,
	"name" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"is_security" boolean DEFAULT false NOT NULL,
	"security_score" integer,
	"security_reasons" jsonb,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "releases_repository_id_forge_release_id_unique" UNIQUE("repository_id","forge_release_id")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"forge" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"url" text,
	"last_checked_at" timestamp with time zone,
	"poll_token" text,
	"last_known_release_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_forge_owner_repo_unique" UNIQUE("forge","owner","repo")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"repository_id" bigint NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscribed_by" text NOT NULL,
	"notification_mode" text NOT NULL,
	CONSTRAINT "subscriptions_channel_id_repository_id_unique" UNIQUE("channel_id","repository_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_channel_id" ON "notifications" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_releases_repository_id_published_at" ON "releases" USING btree ("repository_id","published_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_subscriptions_repository_id" ON "subscriptions" USING btree ("repository_id");