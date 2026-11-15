-- ============================================================================
-- DEPLOYMENT STAGE 4: SAFE RESTORATION & INDIVIDUAL VERIFICATION SCRIPT
-- Application: Sunday School Student Grading Management System
-- Institution: ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
-- ============================================================================
-- NOTE: Restores ONLY untouched accounts whose deploymentRestrictionId marker
-- is intact and tokenVersion equals the expected Stage 1 value.
-- Accounts deliberately modified, deactivated, soft-deleted, or changed during
-- the maintenance window are skipped and flagged for review.
-- ============================================================================

BEGIN;

-- 1. Preflight: Acquire exclusive row-level FOR UPDATE locks on existing users via INNER JOIN
SELECT u.id
FROM users u
INNER JOIN _deployment_admin_state s ON u.id = s.user_id
WHERE s.deployment_id = 'deploy-20261113-admin-separation'
FOR UPDATE OF u;

-- 2. Stage 4 Restoration:
-- Restores ONLY accounts where:
-- - Snapshot indicates originally active
-- - Account still exists and role is ADMIN
-- - Not soft-deleted
-- - Currently inactive
-- - Marker exactly matches the deployment ID
-- - TokenVersion exactly equals expected Stage 1 value (s.original_token_version + 1)
UPDATE users u
SET "isActive" = true,
    "deploymentRestrictionId" = NULL
FROM _deployment_admin_state s
WHERE u.id = s.user_id
  AND s.deployment_id = 'deploy-20261113-admin-separation'
  AND s.original_is_active = true
  AND u.role = 'ADMIN'
  AND u."isDeleted" = false
  AND u."isActive" = false
  AND u."deploymentRestrictionId" = 'deploy-20261113-admin-separation'
  AND u."tokenVersion" = (s.original_token_version + 1);

-- 3. Individual State Verification Query:
-- Classifies every snapshot record into exactly one verified outcome
SELECT 
    s.user_id,
    u.username,
    s.original_is_active,
    u."isActive" AS current_is_active,
    u."tokenVersion" AS current_token_version,
    u."deploymentRestrictionId" AS current_restriction_marker,
    CASE
        -- Missing User
        WHEN u.id IS NULL THEN 'MISSING_USER'
        -- Soft-deleted
        WHEN u."isDeleted" = true THEN 'SOFT_DELETED'
        -- Originally Inactive (never restricted, remained inactive)
        WHEN s.original_is_active = false AND u."isActive" = false AND u."deploymentRestrictionId" IS NULL THEN 'ORIGINALLY_INACTIVE'
        -- Successfully Restored
        WHEN s.original_is_active = true AND u."isActive" = true AND u."deploymentRestrictionId" IS NULL AND u."tokenVersion" = (s.original_token_version + 1) THEN 'RESTORED'
        -- Intentionally Modified during deployment window (marker cleared or altered)
        WHEN u."deploymentRestrictionId" IS NULL OR u."deploymentRestrictionId" != 'deploy-20261113-admin-separation' THEN 'INTENTIONALLY_MODIFIED'
        -- Unexpected Drift (e.g. unexpected tokenVersion bump or mismatched marker)
        ELSE 'UNEXPECTED_DRIFT'
    END AS verification_status
FROM _deployment_admin_state s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.deployment_id = 'deploy-20261113-admin-separation'
ORDER BY s.user_id ASC;

COMMIT;
