// Accounts, sessions and the login throttle. Same approach as ../sharpen:
// PBKDF2 passwords, sha256-hashed session tokens, throttle rows in D1.
import { first, q, type D1 } from "./db";
import type { User } from "../lib/types";

export const COOKIE = "hifz_sid";
const SESSION_DAYS = 30;
const ITERATIONS = 100_000; // PBKDF2-SHA256; Workers cap PBKDF2 at 100k
// [count, seconds]: wrong passwords per account and per network, sign-ups per network.
export const LIMITS = { email: [5, 900], ip: [20, 900], register: [5, 3600] } as const;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const now = () => Math.floor(Date.now() / 1000);
const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));

export async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.slice(0, 200)), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256));
}

export async function newPasswordHash(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pw_hash: await hashPassword(password, salt), salt: hex(salt) };
}

/** Always hashes, even with no stored row, so timing doesn't reveal which emails exist. */
export async function checkPassword(password: string, row: { pw_hash: string; salt: string } | null) {
  const got = await hashPassword(password, row ? unhex(row.salt) : new Uint8Array(16));
  if (!row || got.length !== row.pw_hash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ row.pw_hash.charCodeAt(i);
  return diff === 0;
}

/** IPv6 clients are grouped by /64 (one customer's block), so rotating addresses doesn't help. */
export function ipKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const groups = [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":") + "::/64";
}

export async function throttled(db: D1, key: string, [max, secs]: readonly number[]) {
  const r = await first<{ n: number }>(db, "SELECT COUNT(*) AS n FROM fails WHERE key = ? AND t > ?", key, now() - secs);
  return (r?.n ?? 0) >= max;
}

export async function noteFailure(db: D1, ...keys: string[]) {
  // Nothing older than the longest window survives, so the table stays tiny.
  await db.batch([
    q(db, "DELETE FROM fails WHERE t < ?", now() - LIMITS.register[1]),
    ...keys.map((k) => q(db, "INSERT INTO fails (key, t) VALUES (?, ?)", k, now())),
  ]);
}

export const clearFailures = (db: D1, key: string) => q(db, "DELETE FROM fails WHERE key = ?", key).run();

export const sessionCookie = (tok: string, maxAge: number) =>
  `${COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export function sessionToken(req: Request): string | null {
  for (const part of (req.headers.get("Cookie") ?? "").split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === COOKIE && v) return v;
  }
  return null;
}

export async function currentUser(req: Request, db: D1): Promise<User | null> {
  const tok = sessionToken(req);
  if (!tok) return null;
  return first<User>(
    db,
    `SELECT u.id, u.name, u.email, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires > ?`,
    await sha256(tok),
    now(),
  );
}

/** Creates a session and returns its Set-Cookie value. */
export async function newSession(db: D1, userId: number): Promise<string> {
  const tok = hex(crypto.getRandomValues(new Uint8Array(32)));
  // ponytail: expired-session sweep on every sign-in scans the table; add a cron trigger if it grows large
  await db.batch([
    q(db, "DELETE FROM sessions WHERE expires < ?", now()),
    q(db, "INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)", await sha256(tok), userId, now() + SESSION_DAYS * 86400),
  ]);
  return sessionCookie(tok, SESSION_DAYS * 86400);
}

export async function endSession(req: Request, db: D1) {
  const tok = sessionToken(req);
  if (tok) await q(db, "DELETE FROM sessions WHERE token_hash = ?", await sha256(tok)).run();
}
