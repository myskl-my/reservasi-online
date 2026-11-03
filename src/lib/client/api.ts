import type { ApiResponse } from "@/lib/types";

export class ApiClientError extends Error {
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly status: number;

  constructor(
    message: string,
    options: {
      code?: string;
      fields?: Record<string, string>;
      status?: number;
    } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code ?? "CLIENT_ERROR";
    this.fields = options.fields ?? {};
    this.status = options.status ?? 0;
  }
}

export async function apiRequest<T>(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
  } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers:
        options.body !== undefined
          ? { "Content-Type": "application/json" }
          : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
      { code: "NETWORK_ERROR" },
    );
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError("Respons server tidak valid.", {
      code: "INVALID_RESPONSE",
      status: response.status,
    });
  }

  if (!payload || !payload.ok) {
    throw new ApiClientError(
      payload && !payload.ok
        ? payload.error.message
        : "Permintaan gagal diproses.",
      {
        code: payload && !payload.ok ? payload.error.code : "UNKNOWN_ERROR",
        fields: payload && !payload.ok ? payload.error.fields : undefined,
        status: response.status,
      },
    );
  }

  return payload.data;
}
