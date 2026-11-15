/**
 * databaseGuard.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Fail-Closed Database Hostname Validation for Staging & Production Isolation.
 * Supports Neon Dual-Endpoint Architecture (Pooled + Direct).
 *
 * Ensures that:
 * 1. Staging / Preview runtime environments ONLY connect to the designated pooled staging Neon database.
 * 2. Staging scripts validate that DATABASE_URL connects to the pooled endpoint
 *    and DATABASE_URL_UNPOOLED connects to the matching direct endpoint.
 * 3. Production deployments NEVER connect to a staging Neon database.
 * 4. Production environments independently validate production host configuration
 *    without requiring staging configuration.
 * 5. Production endpoints (including known and configured) are NEVER allowed in staging.
 * 6. Local development environments can use their explicitly configured local databases.
 * 7. Passwords, tokens, query parameters, and raw connection strings are NEVER logged.
 */

export interface DatabaseGuardOptions {
  databaseUrl?: string;
  databaseUrlUnpooled?: string;
  vercelEnv?: string;
  nodeEnv?: string;
  stagingHostname?: string;
  stagingPooledHostname?: string;
  stagingDirectHostname?: string;
  productionHostname?: string;
}

export const KNOWN_PRODUCTION_ENDPOINTS: readonly string[] = [
  'ep-wispy-moon-betq09nj',
  'ep-wispy-moon-betq09nj-pooler',
];

export function extractDatabaseHost(databaseUrl: string | undefined): string {
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('[DatabaseGuard] DATABASE_URL is not set or empty.');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl.trim());
  } catch {
    throw new Error('[DatabaseGuard] DATABASE_URL is malformed or not a valid URL.');
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) {
    throw new Error('[DatabaseGuard] DATABASE_URL contains an empty hostname.');
  }

  return hostname;
}

export function validateProductionHostname(productionHostname: string | undefined): {
  pooledHost?: string;
  directHost?: string;
  normalizedHost?: string;
} | undefined {
  if (!productionHostname || productionHostname.trim() === '') {
    return undefined;
  }
  const normProd = productionHostname.toLowerCase().trim();
  const forbidden = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

  if (
    forbidden.includes(normProd) ||
    normProd.startsWith('localhost:') ||
    normProd.includes(' ') ||
    normProd.startsWith(':') ||
    normProd.endsWith(':')
  ) {
    throw new Error(`[DatabaseGuard] Malformed production hostname configuration: '${normProd}'.`);
  }

  if (normProd.includes('neon.tech')) {
    if (!isNeonEndpoint(normProd)) {
      throw new Error(`[DatabaseGuard] Malformed production hostname configuration: '${normProd}'.`);
    }
    const prodPair = deriveNeonEndpointPair(normProd);
    return {
      pooledHost: prodPair.pooledHost,
      directHost: prodPair.directHost,
      normalizedHost: normProd,
    };
  }

  return { normalizedHost: normProd };
}

export function isProductionHost(hostname: string, configuredProd?: string): boolean {
  // Validate explicitly configured production host if provided
  const validated = validateProductionHostname(configuredProd);

  if (!hostname || typeof hostname !== 'string') return false;
  const norm = hostname.toLowerCase().trim();

  // 1. Check known production endpoints
  if (KNOWN_PRODUCTION_ENDPOINTS.some((prod) => norm.includes(prod))) {
    return true;
  }

  // 2. Check explicitly configured production host
  if (validated) {
    if (validated.pooledHost && validated.directHost) {
      if (norm === validated.pooledHost || norm === validated.directHost) {
        return true;
      }
    } else if (validated.normalizedHost) {
      if (norm === validated.normalizedHost) {
        return true;
      }
    }
  }

  return false;
}

export function isNeonEndpoint(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const norm = hostname.toLowerCase().trim();
  const firstDot = norm.indexOf('.');
  if (firstDot <= 0) return false;
  const firstLabel = norm.slice(0, firstDot);
  const domain = norm.slice(firstDot + 1);
  if (!domain.endsWith('.neon.tech') && domain !== 'neon.tech') return false;
  if (!firstLabel.startsWith('ep-')) return false;
  const baseId = firstLabel.endsWith('-pooler') ? firstLabel.slice(0, -7) : firstLabel;
  if (baseId.length <= 3) return false;
  if (!/^ep-[a-z0-9-]+$/.test(baseId)) return false;
  return true;
}

export function deriveNeonEndpointPair(hostname: string): { pooledHost: string; directHost: string } {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('[DatabaseGuard] Hostname is required to derive Neon endpoint pair.');
  }
  const norm = hostname.toLowerCase().trim();
  if (!isNeonEndpoint(norm)) {
    throw new Error(`[DatabaseGuard] Invalid Neon endpoint hostname format: '${norm}'.`);
  }
  const firstDot = norm.indexOf('.');
  const firstLabel = norm.slice(0, firstDot);
  const domain = norm.slice(firstDot + 1);
  const isPooled = firstLabel.endsWith('-pooler');
  const baseId = isPooled ? firstLabel.slice(0, -7) : firstLabel;

  return {
    pooledHost: `${baseId}-pooler.${domain}`,
    directHost: `${baseId}.${domain}`,
  };
}

export function verifyNeonEndpointPair(pooledHost: string, directHost: string): boolean {
  if (!isNeonEndpoint(pooledHost) || !isNeonEndpoint(directHost)) {
    return false;
  }
  const pFirstLabel = pooledHost.slice(0, pooledHost.indexOf('.'));
  if (!pFirstLabel.endsWith('-pooler')) {
    return false;
  }
  const dFirstLabel = directHost.slice(0, directHost.indexOf('.'));
  if (dFirstLabel.endsWith('-pooler')) {
    return false;
  }

  const derivedFromPooled = deriveNeonEndpointPair(pooledHost);
  const derivedFromDirect = deriveNeonEndpointPair(directHost);

  return (
    derivedFromPooled.pooledHost === derivedFromDirect.pooledHost &&
    derivedFromPooled.directHost === derivedFromDirect.directHost
  );
}

export function hasStagingConfiguration(options: DatabaseGuardOptions = {}): boolean {
  const explicitPooled = options.stagingPooledHostname ?? process.env['STAGING_POOLED_HOSTNAME'];
  const explicitDirect = options.stagingDirectHostname ?? process.env['STAGING_DIRECT_HOSTNAME'];
  const legacyStaging = options.stagingHostname ?? process.env['STAGING_HOSTNAME'];

  return Boolean(
    (explicitPooled && explicitPooled.trim() !== '') ||
    (explicitDirect && explicitDirect.trim() !== '') ||
    (legacyStaging && legacyStaging.trim() !== '')
  );
}

export function resolveStagingHostnames(options: DatabaseGuardOptions = {}): {
  pooledHost: string;
  directHost: string;
} {
  const explicitPooled = options.stagingPooledHostname ?? process.env['STAGING_POOLED_HOSTNAME'];
  const explicitDirect = options.stagingDirectHostname ?? process.env['STAGING_DIRECT_HOSTNAME'];
  const legacyStaging = options.stagingHostname ?? process.env['STAGING_HOSTNAME'];
  const configuredProd = options.productionHostname ?? process.env['PRODUCTION_HOSTNAME'];

  const forbidden = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

  const normPooled = explicitPooled ? explicitPooled.toLowerCase().trim() : undefined;
  const normDirect = explicitDirect ? explicitDirect.toLowerCase().trim() : undefined;
  const normLegacy = legacyStaging ? legacyStaging.toLowerCase().trim() : undefined;

  let resolvedPair: { pooledHost: string; directHost: string } | undefined;

  // Case 1: Both explicit variables provided
  if (normPooled && normDirect) {
    if (
      forbidden.includes(normPooled) ||
      forbidden.includes(normDirect) ||
      normPooled.startsWith('localhost:') ||
      normDirect.startsWith('localhost:')
    ) {
      throw new Error('[DatabaseGuard] Staging endpoint cannot be a local/loopback address.');
    }
    if (isProductionHost(normPooled, configuredProd) || isProductionHost(normDirect, configuredProd)) {
      throw new Error('[DatabaseGuard] CRITICAL REJECTION: Production database host detected in staging configuration.');
    }
    if (!verifyNeonEndpointPair(normPooled, normDirect)) {
      throw new Error(
        `[DatabaseGuard] Mismatched Neon endpoint pair: pooled '${normPooled}' and direct '${normDirect}' do not belong to the same endpoint project.`
      );
    }
    resolvedPair = { pooledHost: normPooled, directHost: normDirect };
  } else if (normPooled) {
    // Case 2a: Only explicit pooled provided
    if (forbidden.includes(normPooled) || normPooled.startsWith('localhost:')) {
      throw new Error('[DatabaseGuard] Staging endpoint cannot be a local/loopback address.');
    }
    if (isProductionHost(normPooled, configuredProd)) {
      throw new Error('[DatabaseGuard] CRITICAL REJECTION: Production database host detected in staging configuration.');
    }
    resolvedPair = deriveNeonEndpointPair(normPooled);
  } else if (normDirect) {
    // Case 2b: Only explicit direct provided
    if (forbidden.includes(normDirect) || normDirect.startsWith('localhost:')) {
      throw new Error('[DatabaseGuard] Staging endpoint cannot be a local/loopback address.');
    }
    if (isProductionHost(normDirect, configuredProd)) {
      throw new Error('[DatabaseGuard] CRITICAL REJECTION: Production database host detected in staging configuration.');
    }
    resolvedPair = deriveNeonEndpointPair(normDirect);
  } else if (normLegacy) {
    // Case 3: Only legacy STAGING_HOSTNAME provided
    if (forbidden.includes(normLegacy) || normLegacy.startsWith('localhost:')) {
      throw new Error('[DatabaseGuard] STAGING_HOSTNAME cannot be a local/loopback address in Preview.');
    }
    if (isProductionHost(normLegacy, configuredProd)) {
      throw new Error(
        '[DatabaseGuard] CRITICAL REJECTION: Production database host detected in Preview deployment. Aborting connection.'
      );
    }
    resolvedPair = deriveNeonEndpointPair(normLegacy);
  } else {
    // Case 4: No staging configuration provided
    throw new Error(
      '[DatabaseGuard] STAGING_HOSTNAME environment variable is required in Preview/Staging deployments.'
    );
  }

  // Conflict detection: If legacy STAGING_HOSTNAME was provided alongside explicit variable(s),
  // it MUST match either the pooled or direct host of the resolved pair.
  if (normLegacy && (normPooled || normDirect)) {
    if (normLegacy !== resolvedPair.pooledHost && normLegacy !== resolvedPair.directHost) {
      throw new Error(
        `[DatabaseGuard] Configuration conflict: STAGING_HOSTNAME ('${normLegacy}') conflicts with explicit staging variables (pooled: '${resolvedPair.pooledHost}', direct: '${resolvedPair.directHost}').`
      );
    }
  }

  return resolvedPair;
}

export function validateStagingDatabasePair(options: DatabaseGuardOptions = {}): {
  pooledHost: string;
  directHost: string;
} {
  const dbUrl = options.databaseUrl ?? process.env['DATABASE_URL'];
  const dbUrlUnpooled = options.databaseUrlUnpooled ?? process.env['DATABASE_URL_UNPOOLED'];

  if (!dbUrl || dbUrl.trim() === '') {
    throw new Error('[DatabaseGuard] DATABASE_URL is not set or empty.');
  }
  if (!dbUrlUnpooled || dbUrlUnpooled.trim() === '') {
    throw new Error('[DatabaseGuard] DATABASE_URL_UNPOOLED is not set or empty.');
  }

  let pooledHost: string;
  try {
    pooledHost = extractDatabaseHost(dbUrl);
  } catch (err: any) {
    throw new Error(`[DatabaseGuard] DATABASE_URL is invalid: ${err.message}`);
  }

  let directHost: string;
  try {
    directHost = extractDatabaseHost(dbUrlUnpooled);
  } catch (err: any) {
    throw new Error(`[DatabaseGuard] DATABASE_URL_UNPOOLED is invalid: ${err.message}`);
  }

  const forbidden = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  if (
    forbidden.includes(pooledHost) ||
    forbidden.includes(directHost) ||
    pooledHost.startsWith('localhost:') ||
    directHost.startsWith('localhost:')
  ) {
    throw new Error('[DatabaseGuard] Database URL hostname resolves to a local/loopback address.');
  }

  const configuredProd = options.productionHostname ?? process.env['PRODUCTION_HOSTNAME'];
  if (isProductionHost(pooledHost, configuredProd) || isProductionHost(directHost, configuredProd)) {
    throw new Error('[DatabaseGuard] CRITICAL REJECTION: Production database host detected in staging connection.');
  }

  const expectedPair = resolveStagingHostnames(options);

  // Inverted check
  if (pooledHost === expectedPair.directHost && directHost === expectedPair.pooledHost) {
    throw new Error(
      `[DatabaseGuard] DATABASE_URL and DATABASE_URL_UNPOOLED are inverted: DATABASE_URL must point to the pooled endpoint ('${expectedPair.pooledHost}') and DATABASE_URL_UNPOOLED must point to the direct endpoint ('${expectedPair.directHost}').`
    );
  }

  if (pooledHost !== expectedPair.pooledHost) {
    throw new Error(
      `[DatabaseGuard] DATABASE_URL hostname mismatch: expected pooled host '${expectedPair.pooledHost}', received '${pooledHost}'.`
    );
  }

  if (directHost !== expectedPair.directHost) {
    throw new Error(
      `[DatabaseGuard] DATABASE_URL_UNPOOLED hostname mismatch: expected direct host '${expectedPair.directHost}', received '${directHost}'.`
    );
  }

  return { pooledHost, directHost };
}

export function validateDatabaseHost(options: DatabaseGuardOptions = {}): string {
  const databaseUrl = options.databaseUrl ?? process.env['DATABASE_URL'];
  const vercelEnv = options.vercelEnv ?? process.env['VERCEL_ENV'];
  const nodeEnv = options.nodeEnv ?? process.env['NODE_ENV'] ?? 'development';
  const productionHostname = options.productionHostname ?? process.env['PRODUCTION_HOSTNAME'];

  const parsedHost = extractDatabaseHost(databaseUrl);

  const isPreview = vercelEnv === 'preview' || nodeEnv === 'staging';
  const isProduction = vercelEnv === 'production';
  const isDevOrTest = !isPreview && !isProduction && (nodeEnv === 'development' || nodeEnv === 'test');

  const normalizedProd = productionHostname ? productionHostname.toLowerCase().trim() : undefined;
  const validatedProd = validateProductionHostname(productionHostname);

  // 1. Vercel Preview / Staging Environment Guard
  if (isPreview) {
    const stagingPair = resolveStagingHostnames(options);

    // Reject production host if known or configured
    if (isProductionHost(parsedHost, normalizedProd)) {
      throw new Error(
        '[DatabaseGuard] CRITICAL REJECTION: Production database host detected in Preview deployment. Aborting connection.'
      );
    }

    // Require pooled runtime endpoint for Preview
    if (parsedHost === stagingPair.directHost) {
      throw new Error(
        `[DatabaseGuard] Database hostname mismatch in Preview: received direct host '${parsedHost}', but Preview runtime requires the pooled endpoint '${stagingPair.pooledHost}'.`
      );
    }

    if (parsedHost !== stagingPair.pooledHost) {
      throw new Error(
        `[DatabaseGuard] Database hostname mismatch in Preview: expected pooled host '${stagingPair.pooledHost}', received '${parsedHost}'. Connection aborted.`
      );
    }

    return parsedHost;
  }

  // 2. Vercel Production Environment Guard
  if (isProduction) {
    const forbidden = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (forbidden.includes(parsedHost) || parsedHost.startsWith('localhost:')) {
      throw new Error(
        '[DatabaseGuard] Production deployment cannot connect to a local/loopback database.'
      );
    }

    // If staging configuration is present, validate it and reject production connection to either staging endpoint
    if (hasStagingConfiguration(options)) {
      const stagingPair = resolveStagingHostnames(options);
      if (parsedHost === stagingPair.pooledHost || parsedHost === stagingPair.directHost) {
        throw new Error(
          '[DatabaseGuard] CRITICAL REJECTION: Staging database host detected in Production deployment. Aborting connection.'
        );
      }
    }

    // If production hostname is configured, ensure parsedHost matches the configured production host
    if (validatedProd) {
      if (validatedProd.pooledHost && validatedProd.directHost) {
        if (parsedHost !== validatedProd.pooledHost && parsedHost !== validatedProd.directHost) {
          throw new Error(
            `[DatabaseGuard] Production database hostname mismatch: expected '${validatedProd.pooledHost}' or '${validatedProd.directHost}', received '${parsedHost}'. Connection aborted.`
          );
        }
      } else if (validatedProd.normalizedHost) {
        if (parsedHost !== validatedProd.normalizedHost) {
          throw new Error(
            `[DatabaseGuard] Production database hostname mismatch: expected '${validatedProd.normalizedHost}', received '${parsedHost}'. Connection aborted.`
          );
        }
      }
    }

    return parsedHost;
  }

  // 3. Local Development / Test Environment
  if (isDevOrTest) {
    if (hasStagingConfiguration(options)) {
      const stagingPair = resolveStagingHostnames(options);
      if (parsedHost.includes('neon.tech')) {
        if (parsedHost !== stagingPair.pooledHost && parsedHost !== stagingPair.directHost) {
          throw new Error(
            `[DatabaseGuard] Staging database hostname mismatch in local environment: expected '${stagingPair.pooledHost}' or '${stagingPair.directHost}', received '${parsedHost}'.`
          );
        }
      }
    }

    return parsedHost;
  }

  return parsedHost;
}

/**
 * Resolves and normalizes the runtime DATABASE_URL based on the target environment.
 * - In Vercel Production: preserves the production URL byte-for-byte unchanged.
 * - In Vercel Preview / Local Staging: validates the host against the pooled staging endpoint,
 *   removes channel_binding in-memory (incompatible with Prisma Rust engine), injects
 *   cold-boot timeouts if absent, and preserves all other query parameters.
 * - In Development / Test: validates safe host configuration and returns URL unchanged.
 * - Fails closed on any environment conflict, missing sslmode=require, or host mismatch.
 */
export function resolveRuntimeDatabaseUrl(options: DatabaseGuardOptions = {}): string {
  const databaseUrl = options.databaseUrl ?? process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('[DatabaseGuard] DATABASE_URL is not set or empty.');
  }

  const rawVercelEnv = options.vercelEnv ?? process.env['VERCEL_ENV'];
  const rawNodeEnv = options.nodeEnv ?? process.env['NODE_ENV'];
  const vercelEnv = rawVercelEnv ? rawVercelEnv.toLowerCase().trim() : undefined;
  const nodeEnv = rawNodeEnv ? rawNodeEnv.toLowerCase().trim() : undefined;

  // Environment Conflict Detection (Fail-Closed)
  // 1. Vercel production cannot be paired with staging or test NODE_ENV
  if (vercelEnv === 'production' && (nodeEnv === 'staging' || nodeEnv === 'test')) {
    throw new Error(
      `[DatabaseGuard] Conflicting environment configuration: VERCEL_ENV is '${vercelEnv}' but NODE_ENV is '${nodeEnv}'. Aborting connection.`
    );
  }

  // 2. Local staging cannot be paired with production VERCEL_ENV
  if (nodeEnv === 'staging' && vercelEnv === 'production') {
    throw new Error(
      `[DatabaseGuard] Conflicting environment configuration: NODE_ENV is 'staging' but VERCEL_ENV is 'production'. Aborting connection.`
    );
  }

  const isVercelProduction = vercelEnv === 'production';
  const isVercelPreview = vercelEnv === 'preview';
  const isLocalStaging = nodeEnv === 'staging' && !vercelEnv;
  const isStagingRuntime = isVercelPreview || isLocalStaging;

  // Case 1: Vercel Production Environment
  if (isVercelProduction) {
    // Validate through centralized host guard
    validateDatabaseHost(options);
    // Return original production URL byte-for-byte unchanged
    return databaseUrl;
  }

  // Case 2: Staging / Preview Runtime Environment
  if (isStagingRuntime) {
    // 1. Validate through centralized host guard (validates stagingPair, pooled host requirement, production rejection)
    const validatedHost = validateDatabaseHost(options);
    const stagingPair = resolveStagingHostnames(options);

    if (validatedHost !== stagingPair.pooledHost) {
      throw new Error(
        `[DatabaseGuard] Runtime URL normalization aborted: validated host '${validatedHost}' does not match expected staging pooled host '${stagingPair.pooledHost}'.`
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(databaseUrl.trim());
    } catch {
      throw new Error('[DatabaseGuard] DATABASE_URL is malformed or not a valid URL.');
    }

    // 2. Enforce sslmode=require
    const sslmode = parsed.searchParams.get('sslmode');
    if (sslmode !== 'require') {
      throw new Error(
        `[DatabaseGuard] Staging runtime DATABASE_URL must enforce sslmode=require. Found: '${sslmode ?? 'none'}'.`
      );
    }

    // 3. In-memory removal of channel_binding (incompatible with Prisma Rust query engine)
    parsed.searchParams.delete('channel_binding');

    // 4. Inject cold-start timeouts for Neon compute if absent
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '30');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }

    return parsed.toString();
  }

  // Case 3: Ordinary Local Development / Test Environment
  // Validate through centralized host guard to ensure safe local behavior
  validateDatabaseHost(options);
  // Return development/test URL unchanged (no staging normalization)
  return databaseUrl;
}

