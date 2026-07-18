import { jwtVerify, SignJWT } from "jose";

export const ADMIN_SESSION_COOKIE = "feloral_admin_session";

export const ADMIN_ROLES = new Set([
  "super_admin",
  "admin",
  "manager",
  "editor",
  "support",
  "seo",
  "ai",
]);

export interface AdminSession {
  userId: number;
  role: string;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET در تنظیمات فرانت‌اند تعریف نشده است.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAdminSession(
  userId: number,
  role: string,
): Promise<string> {
  const normalizedRole = role.trim().toLowerCase();

  if (!ADMIN_ROLES.has(normalizedRole)) {
    throw new Error("نقش کاربر برای مدیریت معتبر نیست.");
  }

  return new SignJWT({
    role: normalizedRole,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSessionSecret());
}

export async function verifyAdminSession(
  token?: string,
): Promise<AdminSession | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      getSessionSecret(),
    );

    const userId = Number(payload.sub);
    const role =
      typeof payload.role === "string"
        ? payload.role.trim().toLowerCase()
        : "";

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      !ADMIN_ROLES.has(role)
    ) {
      return null;
    }

    return {
      userId,
      role,
    };
  } catch {
    return null;
  }
}