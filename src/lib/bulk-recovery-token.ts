import crypto from "node:crypto";

const TOKEN_TTL_SECONDS = 10 * 60;

type BulkRecoveryClaims = {
  userId: string | null;
  expiresAt: number;
  authorized?: boolean;
};

function secret(): string {
  const value = process.env.BRICKVALUE_RECOVERY_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("Scan signing key is not configured");
  return "brickvalue-development-recovery";
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueBulkRecoveryToken(userId: string | null, now = Date.now(), authorized = false): string {
  const payload = encode({ userId, authorized, nonce: crypto.randomUUID(), expiresAt: Math.floor(now / 1000) + TOKEN_TTL_SECONDS });
  return `${payload}.${signature(payload)}`;
}

export function verifyBulkRecoveryToken(
  token: string,
  userId: string | null,
  now = Date.now()
): boolean {
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature || providedSignature.length !== signature(payload).length) return false;

  const expected = Buffer.from(signature(payload));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as BulkRecoveryClaims;
    return claims.expiresAt > Math.floor(now / 1000) && claims.userId === userId;
  } catch {
    return false;
  }
}

export function verifiedRecoveryClaims(token: string, userId: string): BulkRecoveryClaims | null {
  if (!verifyBulkRecoveryToken(token, userId)) return null;
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")) as BulkRecoveryClaims;
}
