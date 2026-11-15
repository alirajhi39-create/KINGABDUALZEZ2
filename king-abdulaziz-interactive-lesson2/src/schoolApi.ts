import { demoAction } from "./schoolDemo";
import { SchoolError } from "./schoolTypes";
import type { BackendMode, SchoolSession } from "./schoolTypes";

export type ConnectionState = BackendMode | "unavailable" | "checking";

function previewWithoutApi() {
  return import.meta.env.DEV || window.location.protocol === "file:";
}

export async function detectConnection(): Promise<ConnectionState> {
  try {
    const response = await fetch("/api/school", { cache: "no-store" });
    if (!response.headers.get("content-type")?.includes("application/json")) return previewWithoutApi() ? "demo" : "unavailable";
    const data = await response.json() as { online?: boolean; setupRequired?: boolean };
    if (response.ok && data.online) return "live";
    if (data.setupRequired) return "demo";
    return "unavailable";
  } catch {
    return previewWithoutApi() ? "demo" : "unavailable";
  }
}

export async function schoolAction<T>(
  mode: BackendMode,
  action: string,
  payload: Record<string, unknown> = {},
  session?: SchoolSession | null,
): Promise<T> {
  if (mode === "demo") return await demoAction(action, payload, session ?? undefined) as T;
  let response: Response;
  try {
    response = await fetch("/api/school", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
      cache: "no-store",
    });
  } catch {
    throw new SchoolError("تعذر الوصول إلى الخادم. تحقق من الاتصال ثم حاول مجدداً.", "network_error");
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new SchoolError("واجهة الخادم غير متاحة. تحقق من نشر وظائف Vercel.", "api_unavailable");
  }
  const data = await response.json() as T & { error?: string; code?: string };
  if (!response.ok) throw new SchoolError(data.error ?? "تعذر تنفيذ الطلب.", data.code);
  return data;
}