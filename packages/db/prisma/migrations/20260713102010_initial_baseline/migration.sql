-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'LOCKED', 'SUSPENDED', 'DELETION_PENDING');

-- CreateEnum
CREATE TYPE "platform_tier" AS ENUM ('REGULAR', 'VIP', 'ADMIN');

-- CreateEnum
CREATE TYPE "verification_purpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "sport_preset_status" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "tournament_visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "tournament_status" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'DRAW_READY', 'DRAWN', 'PUBLISHED', 'LIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "tournament_role" AS ENUM ('OWNER', 'MANAGER', 'SCORER', 'VIEWER');

-- CreateEnum
CREATE TYPE "participant_type" AS ENUM ('TEAM', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "category_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email_normalized" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "avatar_key" VARCHAR(512),
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "platform_tier" "platform_tier" NOT NULL DEFAULT 'REGULAR',
    "email_verified_at" TIMESTAMPTZ(3),
    "locale" VARCHAR(16) NOT NULL DEFAULT 'vi',
    "default_timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(512) NOT NULL,
    "password_changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id_hash" VARCHAR(128) NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "ip_prefix_hash" VARCHAR(128),
    "user_agent_summary" VARCHAR(512),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id_hash")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "purpose" "verification_purpose" NOT NULL,
    "user_id" UUID,
    "email_normalized" VARCHAR(320) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_presets" (
    "id" UUID NOT NULL,
    "sport_code" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "rules" JSONB NOT NULL,
    "status" "sport_preset_status" NOT NULL DEFAULT 'DRAFT',
    "effective_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sport_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "sport_preset_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "visibility" "tournament_visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "tournament_status" NOT NULL DEFAULT 'DRAFT',
    "start_at" TIMESTAMPTZ(3),
    "end_at" TIMESTAMPTZ(3),
    "location" JSONB,
    "branding" JSONB,
    "active_publication_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_memberships" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "tournament_role" NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tournament_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_categories" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "sport_preset_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "participant_type" "participant_type" NOT NULL,
    "eligibility_config" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "category_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "competition_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE INDEX "sessions_user_expiry_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "sessions_expiry_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "verification_tokens_user_expiry_idx" ON "verification_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "verification_tokens_email_purpose_idx" ON "verification_tokens"("email_normalized", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_purpose_hash_key" ON "verification_tokens"("purpose", "token_hash");

-- CreateIndex
CREATE INDEX "sport_presets_status_code_idx" ON "sport_presets"("status", "sport_code");

-- CreateIndex
CREATE UNIQUE INDEX "sport_presets_code_version_key" ON "sport_presets"("sport_code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_owner_status_idx" ON "tournaments"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "tournaments_status_start_idx" ON "tournaments"("status", "start_at");

-- CreateIndex
CREATE INDEX "tournament_memberships_user_revoked_idx" ON "tournament_memberships"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_memberships_tournament_user_key" ON "tournament_memberships"("tournament_id", "user_id");

-- CreateIndex
CREATE INDEX "competition_categories_tournament_status_order_idx" ON "competition_categories"("tournament_id", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "competition_categories_tournament_code_key" ON "competition_categories"("tournament_id", "code");

-- AddForeignKey
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_sport_preset_id_fkey" FOREIGN KEY ("sport_preset_id") REFERENCES "sport_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_memberships" ADD CONSTRAINT "tournament_memberships_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_memberships" ADD CONSTRAINT "tournament_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_categories" ADD CONSTRAINT "competition_categories_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_categories" ADD CONSTRAINT "competition_categories_sport_preset_id_fkey" FOREIGN KEY ("sport_preset_id") REFERENCES "sport_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain guardrails not expressible in the Prisma schema.
ALTER TABLE "users" ADD CONSTRAINT "users_version_positive_check" CHECK ("version" > 0);
ALTER TABLE "password_credentials" ADD CONSTRAINT "password_credentials_failed_count_nonnegative_check" CHECK ("failed_count" >= 0);
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_attempts_nonnegative_check" CHECK ("attempts" >= 0);
ALTER TABLE "sport_presets" ADD CONSTRAINT "sport_presets_version_positive_check" CHECK ("version" > 0);
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_version_positive_check" CHECK ("version" > 0);
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_date_order_check" CHECK ("start_at" IS NULL OR "end_at" IS NULL OR "start_at" < "end_at");
ALTER TABLE "tournament_memberships" ADD CONSTRAINT "tournament_memberships_version_positive_check" CHECK ("version" > 0);
ALTER TABLE "competition_categories" ADD CONSTRAINT "competition_categories_display_order_nonnegative_check" CHECK ("display_order" >= 0);
ALTER TABLE "competition_categories" ADD CONSTRAINT "competition_categories_version_positive_check" CHECK ("version" > 0);
