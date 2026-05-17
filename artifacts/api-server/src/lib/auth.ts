import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "dev-fallback-secret-change-in-prod";

export function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const data = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig + "=".repeat((4 - (sig.length % 4)) % 4), "base64"), Buffer.from(expected + "=".repeat((4 - (expected.length % 4)) % 4), "base64"))) {
      return null;
    }
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const colonIdx = hash.indexOf(":");
  if (colonIdx === -1) return false;
  const salt = hash.slice(0, colonIdx);
  const key = hash.slice(colonIdx + 1);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else {
        try {
          const derivedHex = derived.toString("hex");
          if (derivedHex.length !== key.length) { resolve(false); return; }
          resolve(crypto.timingSafeEqual(Buffer.from(derivedHex, "hex"), Buffer.from(key, "hex")));
        } catch {
          resolve(false);
        }
      }
    });
  });
}

export function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(10))
    .map((b) => chars[b % chars.length])
    .join("");
}
