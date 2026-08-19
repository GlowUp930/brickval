import crypto from "node:crypto";

import type { BulkManifestRegion } from "./bulk-identify";
import type { BulkScanInputSource } from "./bulk-scan-input";

const SESSION_TTL_SECONDS = 10 * 60;

export type BulkScanSessionClaims = {
  userId: string | null;
  expiresAt: number;
  scanSource: BulkScanInputSource;
  regionIds: string[];
};

function secret(): string {
  return process.env.BRICKVALUE_RECOVERY_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? "brickvalue-development-recovery";
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueBulkScanSession(
  userId: string | null,
  scanSource: BulkScanInputSource,
  regions: BulkManifestRegion[],
  now = Date.now(),
): string {
  const payload = encode({
    userId,
    scanSource,
    regionIds: regions.map((region) => region.regionId),
    expiresAt: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  });
  return `${payload}.${sign(payload)}`;
}

export function verifyBulkScanSession(
  token: string,
  userId: string | null,
  regionId: string,
  now = Date.now(),
): BulkScanSessionClaims | null {
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature) return null;

  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BulkScanSessionClaims;
    if (
      claims.userId !== userId
      || claims.expiresAt <= Math.floor(now / 1000)
      || !Array.isArray(claims.regionIds)
      || !claims.regionIds.includes(regionId)
      || (claims.scanSource !== "camera" && claims.scanSource !== "photoLibrary")
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
