import { ZodError, type z } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export async function runApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json(
        {
          ok: false,
          error: { code: error.code, message: error.message, fields: error.fields },
        },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Data yang dikirim tidak valid.",
            fields: zodFields(error),
          },
        },
        { status: 400 },
      );
    }

    console.error("[api] unhandled error", error);
    return Response.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada server. Silakan coba lagi.",
        },
      },
      { status: 500 },
    );
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  if (origin !== requestUrl.origin) {
    throw new ApiError(403, "FORBIDDEN_ORIGIN", "Permintaan ditolak.");
  }
}

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Permintaan harus menggunakan JSON.",
    );
  }

  const text = await request.text();
  if (!text) {
    throw new ApiError(400, "EMPTY_BODY", "Data permintaan kosong.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Format JSON tidak valid.");
  }

  return schema.parse(parsed);
}

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function notFound(message = "Data tidak ditemukan."): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string, code = "CONFLICT"): ApiError {
  return new ApiError(409, code, message);
}
