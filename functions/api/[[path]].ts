// The whole API: one Pages Function on D1. Every endpoint is POST /api/<name> with a JSON body;
// data endpoints take {args: [...]} and return the handler's result. Schema: schema.sql.
import { localDateFn, first, type Ctx, type D1 } from "../../server/db";
import {
  ApiError, LIMITS, checkPassword, clearFailures, currentUser, endSession, ipKey,
  newPasswordHash, newSession, noteFailure, sessionCookie, throttled,
} from "../../server/auth";
import { addItem, deleteItem, getItems, seedJuz, updateItem } from "../../server/items";
import { getDailyReviewQueue, promoteToLearned, submitReview } from "../../server/review";
import { getDashboardStats } from "../../server/stats";
import { exportData, importData, updateProfile } from "../../server/settings";

interface Env { DB: D1 }

const MAX_BODY = 4 * 1024 * 1024; // a 10k-item backup is ~1.5 MB
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: Record<string, (c: Ctx, ...args: any[]) => Promise<unknown>> = {
  getItems, addItem, updateItem, deleteItem, seedJuz,
  getDailyReviewQueue, submitReview, promoteToLearned,
  getDashboardStats, exportData, importData, updateProfile,
};

function json(status: number, body: unknown, cookie?: string): Response {
  const h: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (cookie !== undefined) h["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(body), { status, headers: h });
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new ApiError(413, "Too large.");
  let body: unknown;
  try {
    body = JSON.parse(text || "{}");
  } catch {
    throw new ApiError(400, "Bad JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Expected an object.");
  return body as Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

async function route(name: string, req: Request, db: D1): Promise<Response> {
  const body = await readBody(req);
  const ip = ipKey(req.headers.get("CF-Connecting-IP") ?? "unknown");

  if (name === "register") {
    const reg = `reg:${ip}`;
    if (await throttled(db, reg, LIMITS.register)) return json(200, { error: "Too many new accounts from your network. Try again later." });
    const name = str(body.name).trim().slice(0, 100);
    const email = str(body.email).trim().toLowerCase();
    const password = str(body.password);
    if (!name || !email || !password) return json(200, { error: "All fields are required" });
    if (!EMAIL_RE.test(email)) return json(200, { error: "Please enter a valid email address" });
    if (password.length < 8) return json(200, { error: "Password must be at least 8 characters" });
    const h = await newPasswordHash(password);
    const r = await db
      .prepare("INSERT OR IGNORE INTO users (name, email, pw_hash, salt) VALUES (?, ?, ?, ?)")
      .bind(name, email, h.pw_hash, h.salt)
      .run();
    if (!r.meta.changes) return json(200, { error: "An account with this email already exists" });
    await noteFailure(db, reg); // counts accounts created per network
    return json(200, { success: true }, await newSession(db, r.meta.last_row_id));
  }

  if (name === "login") {
    const email = str(body.email).trim().toLowerCase();
    const password = str(body.password);
    if (!email || !password) return json(200, { error: "Email and password are required" });
    const emailKey = `email:${email}`;
    if ((await throttled(db, emailKey, LIMITS.email)) || (await throttled(db, ip, LIMITS.ip))) {
      return json(200, { error: "Too many failed attempts. Try again in 15 minutes." });
    }
    const row = await first<{ id: number; pw_hash: string; salt: string }>(db, "SELECT id, pw_hash, salt FROM users WHERE email = ?", email);
    if (!(await checkPassword(password, row))) {
      await noteFailure(db, emailKey, ip);
      return json(200, { error: "Invalid email or password" });
    }
    await clearFailures(db, emailKey);
    return json(200, { success: true }, await newSession(db, row!.id));
  }

  if (name === "logout") {
    await endSession(req, db);
    return json(200, { success: true }, sessionCookie("", 0));
  }

  const user = await currentUser(req, db);
  if (!user) throw new ApiError(401, "Not signed in.");
  if (name === "me") return json(200, user);

  const handler = Object.hasOwn(data, name) ? data[name] : undefined;
  if (!handler) throw new ApiError(404, "No such endpoint.");
  const args = Array.isArray(body.args) ? body.args : [];
  const ctx: Ctx = { db, userId: user.id, today: localDateFn(Number(req.headers.get("X-TZ-Offset"))) };
  return json(200, (await handler(ctx, ...args)) ?? null);
}

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method !== "POST") throw new ApiError(405, "Use POST.");
    // Writes must come from this site's own pages (blocks cross-site form posts).
    const origin = request.headers.get("Origin");
    // (localhost is exempt: in dev, next dev on :3000 proxies to wrangler on :8788.)
    if (origin && new URL(origin).host !== url.host && url.hostname !== "localhost") {
      throw new ApiError(403, "Cross-site request refused.");
    }
    if ((request.headers.get("Content-Type") ?? "").split(";")[0].trim() !== "application/json") {
      throw new ApiError(415, "Send JSON.");
    }
    return await route(url.pathname.replace(/^\/api\//, ""), request, env.DB);
  } catch (e) {
    if (e instanceof ApiError) return json(e.status, { error: e.message });
    console.error("API error:", e);
    return json(500, { error: "Server error." });
  }
}
