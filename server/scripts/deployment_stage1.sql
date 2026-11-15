-- ============================================================================
-- DEPLOYMENT STAGE 1: IMMUTABLE SNAPSHOT & SAFE ADMIN RESTRICTION SCRIPT
-- Application: Sunday School Student Grading Management System
-- Institution: ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
-- ============================================================================
-- NOTE: Execute within a single transaction with placeholder :deploymentId
-- e.g. \set deploymentId 'deploy-20261113-admin-separation'
-- ============================================================================

BEGIN;

-- 1. Create immutable snapshot table if not exists
CREATE TABLE IF NOT EXISTS _deployment_admin_state (
    deployment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    original_role "UserRole" NOT NULL,
    original_is_active BOOLEAN NOT NULL,
    original_token_version INTEGER NOT NULL,
    original_is_deleted BOOLEAN NOT NULL,
    restricted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT _deployment_admin_state_pkey PRIMARY KEY (deployment_id, user_id)
);

-- 2. Populate snapshot immutably for existing Admin accounts (Retry-safe: DO NOTHING on conflict)
INSERT INTO _deployment_admin_state (
    deployment_id,
    user_id,
    original_role,
    original_is_active,
    original_token_version,
    original_is_deleted
)
SELECT 
    'deploy-20261113-admin-separation',
    id,
    role,
    "isActive",
    "tokenVersion",
    "isDeleted"
FROM users
WHERE role = 'ADMIN'
ON CONFLICT (deployment_id, user_id) DO NOTHING;

-- 3. Preflight: Missing user check using read-only LEFT JOIN (avoids outer-join locking errors)
SELECT s.user_id AS missing_user_id
FROM _deployment_admin_state s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deployment_id = 'deploy-20261113-admin-separation'
  AND u.id IS NULL;

-- 4. Acquire exclusive row-level FOR UPDATE locks on existing users via INNER JOIN
SELECT u.id
FROM users u
INNER JOIN _deployment_admin_state s ON u.id = s.user_id
WHERE s.deployment_id = 'deploy-20261113-admin-separation'
FOR UPDATE OF u;

-- 5. Restrict ONLY originally active Admin accounts:
-- Sets deploymentRestrictionId marker, deactivates, and increments tokenVersion exactly once
UPDATE users u
SET "isActive" = false,
    "tokenVersion" = u."tokenVersion" + 1,
    "deploymentRestrictionId" = 'deploy-20261113-admin-separation'
FROM _deployment_admin_state s
WHERE u.id = s.user_id
  AND s.deployment_id = 'deploy-20261113-admin-separation'
  AND s.original_is_active = true
  AND u.role = 'ADMIN'
  AND u."isDeleted" = false
  AND u."isActive" = true
  AND u."deploymentRestrictionId" IS NULL;

-- 6. Preflight output summary
SELECT 
    s.user_id,
    u.username,
    s.original_is_active,
    u."isActive" AS current_is_active,
    u."tokenVersion" AS current_token_version,
    u."deploymentRestrictionId" AS current_restriction_marker
FROM _deployment_admin_state s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deployment_id = 'deploy-20261113-admin-separation';

COMMIT;
