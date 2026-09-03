const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

const TOKEN_KEY = "hflf.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Thrown for any non-2xx response so callers can `catch` instead of
 *  checking res.ok at every call site. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * One place that knows how to talk to the Go API: it attaches the bearer
 * token, sets JSON headers, and turns error responses into thrown ApiErrors.
 */
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};

  // A file upload is a FormData, and the browser has to set its own
  // Content-Type: multipart needs a boundary string only fetch knows. Setting
  // the header by hand here would produce a body the server cannot parse.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const token = tokenStore.get();
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  // A crashed server returns HTML, not JSON; don't let that throw a confusing
  // parse error on top of the real problem.
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(payload?.error ?? "Something went wrong.", res.status);
  }
  return payload;
}
