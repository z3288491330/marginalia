CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"last_hit" timestamp with time zone DEFAULT now() NOT NULL
);
