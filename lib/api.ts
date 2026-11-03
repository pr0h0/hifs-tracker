"use client";
// Browser client for functions/api. Exports keep the old server-action names so components
// barely changed. Mutations announce "api:changed" and every useApi() refetches, which
// stands in for Next's revalidatePath now that pages are static.
import { useEffect, useState } from "react";
import type { ReviewQueueItem } from "./sm2";
import type { MemorizationItem, User } from "./types";
import type { getDashboardStats } from "../server/stats";
import type { exportData as exportDataFn } from "../server/settings";

const CHANGED = "api:changed";
const onAuthPage = () => /^\/(login|register)\/?$/.test(location.pathname);

export async function call<T>(name: string, ...args: unknown[]): Promise<T> {
  const res = await fetch(`/api/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TZ-Offset": String(-new Date().getTimezoneOffset()),
    },
    body: JSON.stringify({ args }),
  });
  const body = await res.json().catch(() => ({ error: "Server error." }));
  if (res.status === 401 && !onAuthPage()) location.replace("/login");
  if (!res.ok) throw new Error(body?.error ?? "Request failed");
  return body as T;
}

/** POSTs a plain JSON body (auth endpoints read fields, not args). */
async function post(name: string, fields: Record<string, unknown>) {
  const res = await fetch(`/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return (await res.json().catch(() => ({ error: "Server error." }))) as { success?: boolean; error?: string };
}

const mutation =
  <R extends object = { success?: boolean; error?: string }>(name: string) =>
  async (...args: unknown[]): Promise<R & { error?: string }> => {
    try {
      const r = await call<R>(name, ...args);
      window.dispatchEvent(new Event(CHANGED));
      return r;
    } catch (e) {
      return { error: (e as Error).message } as R & { error?: string };
    }
  };

/** Loads `name(...args)` and reloads it after any mutation. */
export function useApi<T>(name: string, ...args: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  const key = JSON.stringify(args);
  useEffect(() => {
    let live = true;
    const load = () =>
      call<T>(name, ...JSON.parse(key)).then(
        (data) => live && setState({ data }),
        (e: Error) => live && setState((s) => ({ ...s, error: e.message })),
      );
    load();
    window.addEventListener(CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(CHANGED, load);
    };
  }, [name, key]);
  return state;
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
export type { MemorizationItem, User };

const form = (fd: FormData) => Object.fromEntries(fd);

export async function login(fd: FormData) {
  const r = await post("login", form(fd));
  if (r.success) location.replace("/");
  return r;
}
export async function register(fd: FormData) {
  const r = await post("register", form(fd));
  if (r.success) location.replace("/");
  return r;
}
export async function logout() {
  await post("logout", {});
  location.replace("/login");
}

export const addItem = (fd: FormData) => mutation("addItem")(form(fd));
export const updateItem = (fd: FormData) => mutation("updateItem")(form(fd));
export const deleteItem = (id: number) => mutation("deleteItem")(id);
export const seedJuz = (juz: number, status: string) =>
  mutation<{ success?: boolean; added?: number; skipped?: number }>("seedJuz")(juz, status);
export const submitReview = (itemId: number, quality: number) =>
  mutation<{ success?: boolean; suggestPromote?: boolean }>("submitReview")(itemId, quality);
export const promoteToLearned = (itemId: number) => mutation("promoteToLearned")(itemId);
export const updateProfile = (fd: FormData) => mutation("updateProfile")(form(fd));
export const importData = (data: unknown) => mutation<{ success?: boolean; count?: number }>("importData")(data);
export const exportData = () => call<Awaited<ReturnType<typeof exportDataFn>>>("exportData");
export const getDailyReviewQueue = (includeLearning: boolean, includeLearned: boolean, limit?: number, juz?: number) =>
  call<ReviewQueueItem[]>("getDailyReviewQueue", includeLearning, includeLearned, limit ?? null, juz ?? null);
