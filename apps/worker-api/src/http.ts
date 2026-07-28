export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      ...extraHeaders,
    },
  });
}

export function noContent(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
    },
  });
}

/** Require Bearer TOOL_ACCESS_TOKEN when configured (skip /health + OPTIONS). */
export function requireToolAccess(request: Request, env: { TOOL_ACCESS_TOKEN?: string }): Response | null {
  const expected = env.TOOL_ACCESS_TOKEN?.trim();
  if (!expected) return null;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token && token === expected) return null;
  return json({ error: "unauthorized", hint: "Send Authorization: Bearer <TOOL_ACCESS_TOKEN>" }, 401);
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
