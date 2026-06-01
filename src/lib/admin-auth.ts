import { createHash, timingSafeEqual } from "node:crypto";

const ADMIN_COOKIE = "shareid_admin_session";
const DEFAULT_ADMIN_PASSWORD = "admin123456";

function passwordValue() {
  return process.env.SHAREID_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
}

function sessionValue() {
  return createHash("sha256").update(passwordValue()).digest("hex");
}

export function getAdminCookieName() {
  return ADMIN_COOKIE;
}

export function isUsingDefaultAdminPassword() {
  return !process.env.SHAREID_ADMIN_PASSWORD?.trim();
}

export function isAdminPasswordValid(candidate: string) {
  const expected = Buffer.from(passwordValue());
  const actual = Buffer.from(candidate);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function getAdminSessionToken() {
  return sessionValue();
}

export function isAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const expected = Buffer.from(sessionValue());
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
