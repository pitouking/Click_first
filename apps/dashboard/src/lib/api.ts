export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://127.0.0.1:8787";

const TOKEN_KEY = "click_first_tool_token";

export function getToolToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToolToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearToolToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  const token = getToolToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });
}
