import { cookies } from "next/headers";
import { getDb } from "./db";
import { redirect } from "next/navigation";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;

  const db = getDb();
  const session = db
    .prepare(
      `SELECT s.*, u.id as user_id, u.name, u.email, u.created_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(sessionId) as
    | { user_id: number; name: string; email: string; created_at: string }
    | undefined;

  if (!session) return null;

  return {
    id: session.user_id,
    name: session.name,
    email: session.email,
    created_at: session.created_at,
  };
}

export async function requireAuth(): Promise<User> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}
