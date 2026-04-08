export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthUser = { id: string; email: string; name: string };
export type AuthResponse = { token: string; user: AuthUser };

type ApiOptions = { token?: string; method?: "GET" | "POST" | "PATCH" | "DELETE" };

function parseErrorMessage(res: Response, text: string, data: unknown): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    return String((data as { error: unknown }).error);
  }
  if (typeof data === "object" && data !== null && "message" in data) {
    return String((data as { message: unknown }).message);
  }
  const trimmed = text.trim();
  if (trimmed.length > 0 && trimmed.length < 400 && !trimmed.startsWith("<")) {
    return trimmed;
  }
  return `HTTP ${res.status} ${res.statusText || "Error"} (${API_URL})`;
}

async function request<T>(path: string, opts: ApiOptions & { body?: unknown } = {}): Promise<T> {
  const { token, method = "GET", body } = opts;
  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Network error";
    throw new Error(
      `${reason}. Check that the API is running and NEXT_PUBLIC_API_URL matches (default ${API_URL}).`
    );
  }

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    throw new Error(parseErrorMessage(res, text, data));
  }

  return data as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: "POST", body, token });
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: "GET", token });
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: "PATCH", body, token });
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: "DELETE", token });
}
