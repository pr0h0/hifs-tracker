"use server";

import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { clearFailures, isLimited, recordFailure } from "@/lib/rate-limit";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_DAYS = 30;

async function startSession(userId: number) {
  const sessionId = crypto.randomUUID();
  // Same format as SQLite's datetime('now') so the expiry comparison is correct.
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`,
    )
    .run(sessionId, userId);
  (await cookies()).set("session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function register(formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim().slice(0, 100);
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: number } | undefined;

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email, passwordHash);

  await startSession(Number(result.lastInsertRowid));
  redirect("/");
}

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // 5 failures per account and 20 per IP in 15 minutes. x-forwarded-for is only
  // trustworthy behind a proxy that sets it; the per-email limit holds either way.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip}`;
  if (isLimited(emailKey, 5) || isLimited(ipKey, 20)) {
    return { error: "Too many failed attempts. Try again in 15 minutes." };
  }

  const db = getDb();

  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: number; password_hash: string } | undefined;

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    recordFailure(emailKey);
    recordFailure(ipKey);
    return { error: "Invalid email or password" };
  }

  clearFailures(emailKey);
  await startSession(user.id);
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  cookieStore.delete("session_id");
  redirect("/login");
}
